import { useEffect, useState } from "react";
import "./App.scss";
import { ImageZoom } from "./components/ImageZoom";

const Icons = [
  "gather-app-icon-moon.png",
  "gather-app-icon-hand.png",
  "gather-app-icon-clouds.png",
  "gather-app-icon-water.png",
];

function App() {
  const [iconSrc, setIconSrc] = useState(Icons[0]);
  const rerollIcon = (finalIconIdx?: number) => {
    let currentIndex = Icons.indexOf(iconSrc);
    const maxIndex = Icons.length - 1;
    const interval = setInterval(() => {
      if (currentIndex < maxIndex) {
        currentIndex++;
      } else {
        currentIndex = 0;
      }
      setIconSrc(Icons[currentIndex]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setIconSrc(
        Icons[finalIconIdx ?? Math.floor(Math.random() * Icons.length)]
      );
    }, 1000); // Adjust time for longer rolling
  };
  useEffect(() => {
    rerollIcon(0);
  }, []);

  return (
    <>
      <main>
        <h1
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".8rem",
            fontSize: "72px",
          }}
        >
          <img
            src={iconSrc}
            className="logo"
            onClick={() => {
              rerollIcon();
            }}
          />{" "}
          Gather
        </h1>
        <div className="description">
          <h3>
            Gather is a local-first app for archiving, cultivating, and curating
            your data collections.
          </h3>
        </div>
        <img src="/cover-no-bg.png" className="cover" />
        <div className="carousel">
          {/* TODO: add hero demo */}
          <ImageZoom src="/gather-app-texts.png" />
          <ImageZoom src="/gather-app-organize.png" />
          <ImageZoom src="/gather-app-review.png" />
          <ImageZoom src="/gather-app-chats.png" />
          <ImageZoom src="/gather-collections-screen.png" />
        </div>
        <div className="stickies">
          <img src="/gather-title-sticky-1.png" className="sticky" />
          <img src="/gather-title-sticky-2.png" className="sticky" />
          <img src="/gather-title-sticky-3.png" className="sticky" />
          <img src="/gather-title-sticky-4.png" className="sticky" />
        </div>

        <div
          className="cta"
          style={{
            textAlign: "center",
          }}
        >
          <p>
            Available now in beta on{" "}
            <a href="https://testflight.apple.com/join/dnskzBf8">iOS</a> and{" "}
            <a href="https://play.google.com/store/apps/details?id=net.tiny_inter.gather">
              Android
            </a>
            .
            <br />
            Coming soon to app stores..
          </p>
        </div>
        <div className="description">
          {/* TODO: make these all telescopic that swap between and have a button that allows you to randomize */}
          <p>
            <strong>Gather is ...</strong>
          </p>
          <ul>
            <li>
              an interface for collecting and cultivating homegrown collections
              (databases) that bridges the instant experience of texting
              yourself and the curated experience of folder organization
              <ul>
                <li>a personal discord + your assets folder</li>
                <li>
                  your text conversation with yourself + your photo albums
                </li>
                <li>
                  your downloads folder + your{" "}
                  <a href="http://are.na">are.na</a>
                </li>
                <li>your camera roll + your figma moodboard</li>
                <li>
                  <a href="https://www.are.na/spencer-chang/gather-aqbjgwcvh1y">
                    and more...
                  </a>
                </li>
              </ul>
            </li>
            <li>
              a client for local-first archival that works with multiple data
              sources
            </li>
            <li>a social media for sharing rather than broadcasting</li>
          </ul>
          <p>
            <strong>that helps you...</strong>
          </p>
          <ul>
            <li>
              cultivate a personal creative practice through an archival
              practice
            </li>
            <li>
              gather all the digital objects that call to you and all the people
              you love
            </li>
            <li>
              manage hand-maintained &quot;databases&quot; in a native app
              interface
            </li>
            <li>
              sync your data to your favorite places (
              <a href="http://are.na">are.na</a>) and from common input sources
              (photo albums)
            </li>
            <li>
              present live views of your collections in your existing digital
              environments
            </li>
          </ul>
          <p>
            <strong>that feels like...</strong>
          </p>
          <ul>
            <li>
              a &quot;scrapbook / field guide / marked up collection of
              poetry&quot; vs. &quot;art coffee book&quot;
              <ul>
                <li>
                  for the messy, the unsorted, the raw, that is filtered into
                  the presentable
                </li>
              </ul>
            </li>
            <li>
              a space for notes app poets, a library for home archivists, a
              directory for scrapbookers, a universe for twitter thread
              obsessives, a home for tumblr homies
            </li>
          </ul>
          <p>
            <strong>that can be used for...</strong>
          </p>
          <ul>
            <li>things you're grateful for</li>
            <li>things that rewired your brain</li>
            <li>songs that slap</li>
            <li>
              moments{" "}
              <a href="https://spencers.cafe/projects/i-love-living">
                i love living
              </a>
            </li>
            <li>
              <a href="https://www.are.na/spencer-chang/i-want-to-remember-this-fih_jry0poi">
                things i want to remember
              </a>
            </li>
            <li>orange things</li>
            <li>peoplewatching log</li>
            <li>
              <a href="https://spencerchang.me/fits">fits log</a>
            </li>
            <li>mood journal</li>
            <li>
              <a href="https://www.are.na/spencer-chang/wow-geoi3s6ev74">
                wow moments
              </a>
            </li>
            <li>
              <a href="https://kayserifserif.place/">statements of purpose</a>
            </li>
            <li>
              <a href="https://www.aliciaguo.com/nuggets/">musings</a>
            </li>
            <li>
              <a href="https://www.spencerchang.me/window/">
                photos of the sky
              </a>
            </li>
            <li>
              <a href="https://www.are.na/spencer-chang/motivation-ju83elph4iw">
                last motivational watch
              </a>
            </li>
            <li>
              things{" "}
              <a href="https://www.spencerchang.me/#:~:text=A%20non%2Dexhaustive%20list%20of%20the%20things%20I%20enjoy%3A">
                you enjoy
              </a>
            </li>
          </ul>
        </div>
      </main>
      <footer>
        <p
          style={{
            margin: 0,
          }}
        >
          created & maintained by{" "}
          <a href="https://spencerchang.me">spencer chang</a>
        </p>

        <div style={{}}>with support from</div>
        <div className="logos">
          <a href="https://canvas.xyz" target="_blank">
            <div>
              <img src="https://canvas.xyz/logo.svg" />
            </div>
          </a>
          <a href="https://are.na" target="_blank">
            <div>
              <img src="/arena.png" />
            </div>
          </a>
        </div>
      </footer>
    </>
  );
}

export default App;
