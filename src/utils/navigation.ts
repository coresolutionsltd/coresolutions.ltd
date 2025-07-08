// An array of links for navigation bar
const navBarLinks = [
  { name: "Home", url: "/" },
  // { name: "Products", url: "/products" },
  { name: "Services", url: "/services" },
  { name: "Blog", url: "/blog" },
  { name: "Contact", url: "/contact" },
];
// An array of links for footer
const footerLinks = [
  // {
  //   section: "Ecosystem",
  //   links: [
  //     { name: "Documentation", url: "/docs/" },
  //   ],
  // },
  {
    section: "Company",
    links: [
      { name: "About us", url: "/about" },
      { name: "Blog", url: "/blog" },
      // { name: "Careers", url: "#" },
      // { name: "Customers", url: "#" },
    ],
  },
];
// An object of links for social icons
const socialLinks = {
  github: "https://github.com/coresolutionsltd",
  linkedin: "https://www.linkedin.com/company/coresolutionsltd",
  slack: "https://coresolutionsltd.slack.com/",
};

export default {
  navBarLinks,
  footerLinks,
  socialLinks,
};
