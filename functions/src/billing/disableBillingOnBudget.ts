import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { logger } from 'firebase-functions';
import { CloudBillingClient } from '@google-cloud/billing';

/** The Pub/Sub topic the Cloud Billing budget publishes its alerts to. */
export const BUDGET_ALERT_TOPIC = 'billing-alerts';

interface BudgetNotification {
  budgetDisplayName?: string;
  costAmount?: number;
  budgetAmount?: number;
  currencyCode?: string;
  alertThresholdExceeded?: number;
}

/**
 * The project's last-resort circuit breaker: when actual spend passes the
 * budget, this detaches the billing account from the project, which stops
 * everything billable dead.
 *
 * This is deliberately blunt. Firestore has no spend cap and no rate limit —
 * maxInstances bounds what the functions can burn, but nothing bounds the
 * operations a client can drive directly. Every other defence (App Check,
 * verified email) raises the cost of abuse; only this one has a ceiling.
 *
 * What it costs when it fires: the app goes down. Firestore stops serving,
 * functions stop running, and it stays that way until billing is re-enabled by
 * hand in the console. That is the trade — a dead app for a few hours beats a
 * four-figure invoice — so it only triggers at 100% of the budget, never at the
 * 50%/90% warning thresholds, which exist precisely so a human can look first.
 *
 * Requires two things done once by a human, both outside this repo:
 *   1. the budget in Cloud Billing must publish to the BUDGET_ALERT_TOPIC topic
 *   2. this function's service account needs the Billing Account Administrator
 *      role on the billing account — without it the disable call is rejected,
 *      and the failure is only visible in these logs
 */
export const disableBillingOnBudget = onMessagePublished(
  { topic: BUDGET_ALERT_TOPIC, region: 'europe-west1', retry: false },
  async (event) => {
    const notification = (event.data.message.json ?? {}) as BudgetNotification;
    const { costAmount, budgetAmount, currencyCode, budgetDisplayName } = notification;

    if (typeof costAmount !== 'number' || typeof budgetAmount !== 'number') {
      logger.warn('Értelmezhetetlen költségkeret-értesítés, kihagyva', { notification });
      return;
    }

    if (costAmount <= budgetAmount) {
      logger.info('Költségkeret-riasztás a küszöb alatt, nincs teendő', {
        budgetDisplayName,
        costAmount,
        budgetAmount,
        currencyCode,
      });
      return;
    }

    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
      logger.error('Nincs projektazonosító a környezetben, a számlázás nem tiltható le');
      return;
    }
    const projectName = `projects/${projectId}`;
    const client = new CloudBillingClient();

    const [billingInfo] = await client.getProjectBillingInfo({ name: projectName });
    if (!billingInfo.billingEnabled) {
      // Budget alerts keep arriving for a while after the account is detached;
      // without this every one of them would re-run the disable call.
      logger.info('A számlázás már le van tiltva, nincs teendő', { projectName });
      return;
    }

    logger.error('TÚLLÉPETT KÖLTSÉGKERET — a számlázás letiltása következik', {
      budgetDisplayName,
      costAmount,
      budgetAmount,
      currencyCode,
      projectName,
    });

    // An empty billingAccountName is what detaches the account; there is no
    // separate "disable" call in the API.
    await client.updateProjectBillingInfo({
      name: projectName,
      projectBillingInfo: { billingAccountName: '' },
    });

    logger.error('A számlázás letiltva. Az alkalmazás leállt, kézzel kell visszakapcsolni.', {
      projectName,
    });
  }
);
