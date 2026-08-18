import { useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

interface HomeTipsProps {
  /**
   * The invite tip is only useful to someone who isn't in a group yet — once
   * you've joined one, it's answering a question you no longer have.
   */
  showInviteTip: boolean;
}

interface Tip {
  key: string;
  title: string;
  body: ReactNode;
}

/**
 * What the home screen says while it has nothing to show.
 *
 * Paged rather than stacked: at the top of the screen a column of five text
 * blocks would push the actual app below the fold on the one screen where a
 * newcomer is trying to find it. One card at a time costs a swipe and keeps the
 * list itself visible underneath.
 *
 * The moment a first item lands these disappear for good — the caller decides
 * that, so they can never become permanent furniture above someone's shopping
 * list.
 */
export function HomeTips({ showInviteTip }: HomeTipsProps) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const tips: Tip[] = [
    {
      key: 'start',
      title: 'Csak kezdd el írni',
      body: (
        <Text style={styles.body}>
          Nem kell semmit beállítani. Írd be alul, mi kell — kenyér, tej —, és már a listádon is
          van. Ha a mennyiség is számít, azt is odaírhatod: 2 kg, 1 doboz. Amit egyszer beírtál,
          azt legközelebb felkínálja.
        </Text>
      ),
    },
    {
      key: 'shopping',
      title: 'Bevásárlás közben',
      body: (
        <Text style={styles.body}>
          Koppints a tételre, ha bekerült a kosárba — átkerül a{' '}
          <Text style={styles.ui}>Megvéve</Text> közé. Ha mégis meggondolod magad, koppints rá
          újra, és visszaugrik a listára. Bevásárlás után a{' '}
          <Text style={styles.ui}>Mind törlése</Text> egy mozdulattal leszedi, ami már megvan.
        </Text>
      ),
    },
    {
      key: 'lists',
      title: 'Több lista, több ritmus',
      body: (
        <Text style={styles.body}>
          Ami hetente kell, és ami félévente, nem ugyanaz a lista. Készíts külön listát — Napi,
          Heti, Ritkán vásárolt —, és mindegyik a maga tempójában él. A főképernyőn lévő
          bevásárlólistád marad az, amibe csak úgy bedobsz dolgokat.
        </Text>
      ),
    },
    {
      key: 'sharing',
      title: 'Osszd meg, akivel együtt vásárolsz',
      body: (
        <>
          <Text style={styles.body}>
            A <Text style={styles.ui}>Megosztás</Text> gombbal a bevásárlólistádat adod közösbe —
            adj nevet a körnek, például Kovács Család, és onnantól mindenki ugyanazt látja: mi
            hiányzik még, és mit vett meg valaki az imént.
          </Text>
          <Text style={[styles.body, styles.bodySpaced]}>
            Egy-egy listát külön is megoszthatsz. A Szülinapi buli listát elég a vendégekkel — ott
            mindenki látja, mi van még hátra, és nem lesz három tál majonézes saláta.
          </Text>
        </>
      ),
    },
  ];

  if (showInviteTip) {
    tips.push({
      key: 'invite',
      title: 'Meghívóval jöttél?',
      body: (
        <>
          <Text style={styles.body}>
            Ha linket kaptál, elég rákoppintani — az app megnyitja a meghívót. Ha kódot, akkor a{' '}
            <Text style={styles.ui}>Csatlakozás egy csoporthoz</Text> sorba írd be. Fiókra szükség
            lesz, és az e-mail címedet is vissza kell igazolnod: a közös lista csak így marad azok
            között, akiknek szánták.
          </Text>
          <Text style={[styles.body, styles.bodySpaced]}>
            Ezután a közös bevásárlólista megjelenik a főképernyődön, a sajátod mellett — fent
            tudsz váltani a kettő között. Amit magadnak írsz, az a tiéd marad; a többi tag csak a
            megosztott listát látja.
          </Text>
        </>
      ),
    });
  }

  // Rounded rather than floored: a half-swipe that springs back would otherwise
  // leave the dots showing the page you didn't go to.
  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {tips.map((tip) => (
          // Every page is exactly the viewport's width, which is what makes
          // pagingEnabled land on card boundaries instead of drifting.
          <View key={tip.key} style={[styles.page, { width }]}>
            <Text style={styles.title}>{tip.title}</Text>
            {tip.body}
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {tips.map((tip, index) => (
          <View key={tip.key} style={[styles.dot, index === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
  },
  page: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  bodySpaced: {
    marginTop: 8,
  },
  /** Names of things actually on screen, so they can be found by eye. */
  ui: {
    color: '#333',
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D6D6D6',
  },
  dotActive: {
    backgroundColor: '#4A90D9',
  },
});
