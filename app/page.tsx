import type { Metadata } from "next";
import Image from "next/image";
import UploadMoment, { ShareMomentButton } from "./components/UploadMoment";

export const metadata: Metadata = {
  title: "Deborah & Iyanuoluwa | The Wedding Edition",
  description:
    "Welcome to Deborah and Iyanuoluwa's wedding celebration. Explore the menu and help create their living wedding magazine.",
  openGraph: {
    title: "Deborah & Iyanuoluwa — The Wedding Edition",
    description: "Eat, celebrate and share the moments only you can see.",
    type: "website",
    images: [{ url: "/og-wedding-edition.png", width: 1200, height: 630 }],
  },
};

const menuGroups = [
  {
    number: "01",
    title: "To begin",
    note: "Small chops",
    items: [
      ["Crisp parcels", "Samosa · spring rolls"],
      ["Celebration bites", "Puff-puff · mosa · peppered chicken"],
      ["From the grill", "Spiced chicken skewers"],
    ],
  },
  {
    number: "02",
    title: "The main table",
    note: "Nigerian favourites",
    items: [
      ["Party jollof", "Smoky rice · grilled chicken · fried plantain"],
      ["Fried rice", "Wok vegetables · peppered beef"],
      ["Amala trio", "Ewedu · gbegiri · rich assorted stew"],
      ["Ofada rice", "Ayamase · moin-moin"],
    ],
  },
  {
    number: "03",
    title: "A sweet finish",
    note: "Dessert & drinks",
    items: [
      ["Wedding cake", "Vanilla · chocolate · red velvet"],
      ["Little indulgences", "Fruit cups · chin chin · mini pastries"],
      ["Raise a glass", "Zobo spritz · Chapman · wine · soft drinks"],
    ],
  },
];

const timeline = [
  ["2:00 PM", "Welcome & cocktails"],
  ["2:45 PM", "The couple arrives"],
  ["3:15 PM", "Lunch is served"],
  ["4:30 PM", "Toasts, cake & first dance"],
  ["5:30 PM", "The dance floor opens"],
];

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="homePage">
      <section className="hero" id="top">
        <nav className="nav" aria-label="Wedding navigation">
          <a className="wordmark" href="#top" aria-label="Deborah and Iyanuoluwa home">
            <span>Calmcraft</span>
            <strong>The Wedding Edition</strong>
          </a>
          <div className="navItems">
            <a href="#story">Our edition</a>
            <a href="#menu">Menu</a>
            <ShareMomentButton className="navShare">Share a moment</ShareMomentButton>
          </div>
        </nav>

        <div className="heroContent">
          <p className="eyebrow">22 · 08 · 2026 — Lagos, Nigeria</p>
          <h1>
            Deborah <span>&</span>
            <br />Iyanuoluwa
          </h1>
          <p className="intro">
            Welcome to our celebration. Eat beautifully, dance freely, and help us
            keep every side of the story.
          </p>
          <div className="heroActions">
            <ShareMomentButton className="primaryAction">
              <CameraIcon /> Share a moment
            </ShareMomentButton>
            <a className="textAction" href="#menu">See today&apos;s menu <span>↓</span></a>
          </div>
        </div>

        <div className="portraitWrap">
          <Image
            src="/deborah-iyanu-ivory.jpg"
            alt="Deborah and Iyanuoluwa smiling and holding hands"
            width={876}
            height={1080}
            sizes="(max-width: 760px) calc(100vw - 52px), 39vw"
            priority
          />
          <div className="portraitNote" aria-hidden="true">
            <span>A living keepsake</span>
            <strong>made by everyone here</strong>
          </div>
        </div>

        <div className="heroFoot">
          <span>Victoria Garden Events Center</span>
          <span>Saturday · 2:00 PM</span>
        </div>
      </section>

      <section className="storySection" id="story">
        <div className="sectionIndex" aria-hidden="true">01 / The idea</div>
        <div className="storyCopy">
          <p className="eyebrow">The wedding edition</p>
          <h2>One day.<br /><em>Every perspective.</em></h2>
          <p className="leadCopy">
            A wedding is never just one story. It is the laugh at table seven, the
            cousin who owned the dance floor, and the quiet squeeze of a hand before
            a toast.
          </p>
          <p>
            Share what you see today. Your photographs and little films will be
            thoughtfully curated into Deborah and Iyanuoluwa&apos;s Calmcraft wedding
            magazine — a keepsake told by everyone who was there.
          </p>
          <ShareMomentButton className="inlineLink">Add your perspective <ArrowIcon /></ShareMomentButton>
        </div>
        <figure className="storyPortrait">
          <Image
            src="/deborah-iyanu-black.jpg"
            alt="Deborah looking back at Iyanuoluwa"
            width={876}
            height={1080}
            sizes="(max-width: 760px) 82vw, 30vw"
          />
          <figcaption>Before the vows · The two of us</figcaption>
        </figure>
        <p className="bigQuote" aria-hidden="true">“The story belongs to all of us.”</p>
      </section>

      <section className="menuSection" id="menu">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow lightEyebrow">From the kitchen</p>
            <h2>The celebration<br /><em>menu</em></h2>
          </div>
          <p>
            Made for sharing, seconds, and the kind of table conversations that
            become family stories.
          </p>
        </div>
        <div className="menuGrid">
          {menuGroups.map((group) => (
            <article className="menuCard" key={group.number}>
              <header>
                <span>{group.number}</span>
                <div><h3>{group.title}</h3><p>{group.note}</p></div>
              </header>
              <div className="menuItems">
                {group.items.map(([title, detail]) => (
                  <div className="menuItem" key={title}>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <p className="menuNote">Please let a server know about allergies or dietary needs.</p>
      </section>

      <section className="timelineSection" aria-labelledby="timeline-title">
        <div className="sectionIndex" aria-hidden="true">02 / Today</div>
        <div>
          <p className="eyebrow">A little guide</p>
          <h2 id="timeline-title">Order of<br /><em>celebration</em></h2>
        </div>
        <ol className="timeline">
          {timeline.map(([time, label], index) => (
            <li key={time}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <time>{time}</time>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
      </section>

      <UploadMoment />

      <section className="magazineSection" aria-labelledby="magazine-title">
        <div className="magazineStack" aria-hidden="true">
          <div className="magazineBack" />
          <div className="magazineCover">
            <span>Calmcraft</span>
            <p>The Wedding Edition</p>
            <h3>D <i>&</i> I</h3>
            <strong>22 · 08 · 2026</strong>
          </div>
        </div>
        <div className="magazineCopy">
          <p className="eyebrow">After the last dance</p>
          <h2 id="magazine-title">Today becomes<br /><em>a keepsake.</em></h2>
          <p>
            The photographs shared here will be reviewed with care and woven into a
            bespoke print-and-digital wedding magazine by Calmcraft. Not just the
            perfect poses — the whole feeling of the day.
          </p>
          <div className="keepsakeDetails">
            <div><span>01</span><strong>Collected</strong><small>from every guest</small></div>
            <div><span>02</span><strong>Curated</strong><small>with the couple</small></div>
            <div><span>03</span><strong>Crafted</strong><small>into their edition</small></div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footerTop">
          <div className="wordmark footerMark"><span>Calmcraft</span><strong>The Wedding Edition</strong></div>
          <p>Thank you for being part of our beginning.</p>
          <div className="footerLinks">
            <a href="tel:+2348085732615">Call · 0808 573 2615</a>
            <a href="/our-moments">Couple&apos;s gallery <ArrowIcon /></a>
          </div>
        </div>
        <div className="footerBottom">
          <span>Deborah & Iyanuoluwa</span>
          <span>22 August 2026 · Lagos</span>
          <span>Made with care by Calmcraft</span>
        </div>
      </footer>

      <ShareMomentButton className="mobileUpload"><CameraIcon /> Share a moment</ShareMomentButton>
    </main>
  );
}
