import ogImageSrc from "@images/social.png";

export const SITE = {
  title: "Core Solutions",
  tagline: "Cloud & DevOps Specialists",
  description:
    "Cloud consultancy dedicated to innovation and collaboration. We build secure, scalable solutions.",
  description_short:
    "Cloud consultancy dedicated to innovation and collaboration.",
  url: "https://coresolutions.ltd",
};

export const BLOG = {
  title: "Blog - Core Solutions",
  description:
    "Stay up-to-date with the latest news, tips, and insights on all aspects of software development.",
  url: "https://coresolutions.ltd/blog",
};

export const SEO = {
  title: SITE.title,
  description: SITE.description,
  structuredData: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    inLanguage: "en-US",
    "@id": SITE.url,
    url: SITE.url,
    name: SITE.title,
    description: SITE.description,
    isPartOf: {
      "@type": "WebSite",
      url: SITE.url,
      name: SITE.title,
      description: SITE.description,
    },
  },
};

export const OG = {
  locale: "en_US",
  type: "website",
  url: SITE.url,
  title: `${SITE.title} - Cloud & DevOps Services`,
  description:
    "Cloud consultancy dedicated to innovation and collaboration. We build secure, scalable solutions.",
  image: ogImageSrc,
};
