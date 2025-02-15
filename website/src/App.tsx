import { useEffect, useMemo, useRef, useState } from "react";
import "./App.scss";
import { ImageZoom } from "./components/ImageZoom";

const Icons = [
  "gather-app-icon-moon.png",
  "gather-app-icon-hand.png",
  "gather-app-icon-clouds.png",
  "gather-app-icon-water.png",
];
interface RawArenaChannelItem {
  id: string;
  title: string;
  content: string;
  content_html?: string;
  created_at: string;
  updated_at: string;
  description_html?: string;
  description: string;
  image?: {
    content_type: string;
    display: { url: string };
    square: { url: string };
    thumb: { url: string };
    original: {
      url: string;
    };
  } | null;
  source: {
    url: string;
  } | null;
  url: string;
  base_class: "Block" | "Channel";
  connected_at: string;
  connected_by_user_id: string;
  connected_by_user_slug: string;
  embed?: {
    url: null;
    type: string;
    title: null;
    author_name: string;
    author_url: string;
    source_url: null;
    thumbnail_url: null;
    width: number;
    height: number;
    html: string;
  };
  attachment?: {
    file_name: string;
    file_size: number;
    file_size_display: string;
    content_type: string;
    extension: string;
    url: string;
  };
}

function useArenaChannelBlocks(channelId: string): {
  data: RawArenaChannelItem[];
  error: Error | null;
  loading: boolean;
} {
  const [data, setData] = useState<RawArenaChannelItem[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await fetch(
          `https://api.are.na/v2/channels/${channelId}/contents`
        );
        const json = await response.json();
        setData(json.contents);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch blocks")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [channelId]);

  return { data, error, loading };
}

function App() {
  const [iconSrc, setIconSrc] = useState(Icons[0]);
  const { data: testimonials, loading: isLoading } = useArenaChannelBlocks(
    "gather-testimonials"
  );
  const shuffledTestimonials = useMemo(() => {
    return testimonials.sort(() => Math.random() - 0.5);
  }, [testimonials]);
  const logoRef = useRef<HTMLImageElement>(null);
  const rerollIcon = (finalIconIdx?: number) => {
    let currentIndex = Icons.indexOf(iconSrc);
    const maxIndex = Icons.length - 1;
    logoRef.current?.classList.add("switching");
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
      logoRef.current?.classList.remove("switching");
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
            ref={logoRef}
            src={iconSrc}
            className="logo"
            onClick={() => {
              rerollIcon();
            }}
          />{" "}
          Gather
        </h1>
        <div className="description oneliner">
          <h3>
            Local-first app for archiving, cultivating, and curating multimedia
            data collections.
          </h3>
          <p>
            featuring full offline functionality, multimedia support, and
            optionally syncs to external data sources (like{" "}
            <a href="https://are.na">Are.na</a>). No ads, no logins no tracking,
            and all data is stored on device.
          </p>
        </div>
        <div
          id="cta"
          className="cta"
          style={{
            textAlign: "center",
          }}
        >
          <p>
            Now available on{" "}
            <a href="https://apps.apple.com/us/app/gather-handheld-curiosity/id6468843059">
              iOS
            </a>{" "}
            and{" "}
            <a href="https://play.google.com/store/apps/details?id=net.tiny_inter.gather">
              Android
            </a>{" "}
            <br />
            <span style={{ fontSize: "18px" }}>
              (sign up{" "}
              <a href="https://coda.io/form/Untitled-Form_dwglAPFKR8v?fromWebsite=true">
                email for updates
              </a>
              ).
            </span>
          </p>
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
        <p
          style={{
            fontSize: "2em",
            marginTop: "1em",
            marginBottom: 0,
            fontStyle: "italic",
          }}
        >
          <a href="https://www.are.na/spencer-chang/gather-testimonials">
            testimonials
          </a>
        </p>
        <div className="carousel testimonials">
          {isLoading && <div>Loading...</div>}
          {shuffledTestimonials.map((testimonial) => (
            <>
              {testimonial.image?.display.url ? (
                <ImageZoom src={testimonial.image.display.url} />
              ) : (
                <div key={testimonial.id} className="testimonial">
                  <p>{testimonial.content}</p>
                </div>
              )}
            </>
          ))}
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
            <li>
              <a href="https://www.are.na/spencer-chang/moments-people-made-you-smile-example">
                moments people made you smile
              </a>
            </li>
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
            <li>
              <a href="https://www.are.na/spencer-chang/orange-ffcsx6iwyk8">
                orange things
              </a>
            </li>
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
            <li>
              <a href="https://www.are.na/spencer-chang/gather-good-channels-to-play-with">
                and more...
              </a>
            </li>
          </ul>
          <p>
            learn more through{" "}
            <a href="https://www.are.na/editorial/an-interview-with-spencer-chang">
              my interview with Are.na
            </a>{" "}
            and how to use it on the{" "}
            <a href="https://help.are.na/docs/partner-guides/gather">
              partner guide
            </a>
            .
          </p>
        </div>
      </main>
      <footer>
        <p
          style={{
            margin: 0,
          }}
        >
          created & maintained by{" "}
          <a href="https://spencer.place">spencer chang</a>
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
