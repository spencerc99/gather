import "./App.scss";
import { ImageZoom } from "./components/ImageZoom";

function App() {
  return (
    <>
      <main>
        <img src="/icon.png" className="logo" />

        <div className="description">
          <h3>
            Gather is a local-first app for archiving, cultivating, and curating
            your data collections.
          </h3>
        </div>
        <div className="carousel">
          {/* TODO: add hero demo */}
          <ImageZoom src="/splash.png" />
          <ImageZoom src="/organize-screen.png" />
          <ImageZoom src="/texts-screen.png" />
        </div>
        <div className="description">
          <p>
            <strong>Gather is...</strong>
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
              <ul>
                <li>
                  with custom permissions (just you, select list of
                  collaborators, open to the internet [append-only])
                </li>
              </ul>
            </li>
          </ul>
          <p>
            <strong>that feels like...</strong>
          </p>
          <ul>
            <li>
              &quot;scrapbook / field guide / marked up collection of
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
            <li>my grateful log (prompt-first practices or collections)</li>
            <li>conversation screenshots</li>
            <li>songs that slap</li>
            <li>moments i love living</li>
            <li>things i want to remember</li>
            <li>orange things</li>
            <li>descriptions of people</li>
            <li>behind the scenes</li>
            <li>fits log</li>
            <li>mood journal</li>
            <li>failure resume</li>
            <li>
              statements of purpose / what i care about (inspired by @katherine)
            </li>
            <li>latest photo of moon</li>
            <li>last motivational watch</li>
            <li>converting my &quot;things i enjoy&quot; list</li>
            <li>latest mantra to live by</li>
            <li>
              things you want to revisit embedded into your algorithmic feeds:{" "}
              <a href="https://bulletin.spencerchang.me/">
                https://bulletin.spencerchang.me/
              </a>
            </li>
          </ul>
        </div>
      </main>
      <footer>
        built by <a href="https://spencerchang.me">spencer chang</a>
      </footer>
    </>
  );
}

export default App;
