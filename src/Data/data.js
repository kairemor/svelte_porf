const HEADER = {
  alt: "Kaire Mor",
  img: "img/LogoKm.png"
};

const NAVBAR_DATA = [{
    id: 1,
    url: "#home",
    label: "Home"
  },
  {
    id: 2,
    url: "#services",
    label: "Services"
  },
  {
    id: 3,
    url: "#about-us",
    label: "About us"
  },
  {
    id: 4,
    url: "#portfolio",
    label: "Projects"
  },
  {
    id: 5,
    url: "#contact",
    label: "Contacts"
  }
];
const BANNER_DATA = {
  header: "Mor Kaire",
  description: "I'm a developer and data science enthusiast, student at computer science in Thies Polytechnic",
};
const SOCIAL_MEDIA = [{
    id: 1,
    url: "https://twitter.com/serignemorkaire",
    icon: "ti-twitter"
  },
  {
    id: 2,
    url: "https://facebook.com/kairemor",
    icon: "ti-facebook"
  },
  {
    id: 3,
    url: "https://github.com/kairemor",
    icon: "ti-github"
  },
  {
    id: 4,
    url: "https://www.linkedin.com/in/mor-kaire-54794b15b/",
    icon: "ti-linkedin"
  }
];

const SKILLS = [{
    id: 1,
    icon: "fab fa-js"
  },
  {
    id: 2,
    icon: "fab fa-node-js"
  },
  {
    id: 3,
    icon: "fab fa-react"
  },
  {
    id: 4,
    icon: "fab fa-python"
  }
];
const SERVICE_DATA = {
  header: "Our Services",
  ALL_SERVICES: "All Services",
  SERVICE_LIST: [{
      LABEL: "Search Engine Optimisation",
      DESCRIPTION: "To customise the content, technical functionality and scope of your website so that your pages show for a specific set of keyword at the top of a search engine list. In the end, the goal is to attract traffic to your website when they are searching for goods, services or business-related information.",
      URL: "images/service1.png"
    },
    {
      LABEL: "Content Marketing Strategy",
      DESCRIPTION: "It is tough but well worth the effort to create clever material that is not promotional in nature, but rather educates and inspires. It lets them see you as a reliable source of information by delivering content that is meaningful to your audience.",
      URL: "images/service2.png"
    },
    {
      LABEL: "Develop Social Media Strategy",
      DESCRIPTION: "Many People rely on social networks to discover, research, and educate themselves about a brand before engaging with that organization. The more your audience wants to engage with your content, the more likely it is that they will want to share it.",
      URL: "images/service3.png"
    }
  ]
};

const ABOUT_DATA = {
  header: "about me",
  title: "Development & Data Science ",
  image_url: "images/network.png",
  content: "My name is Mor Kaire I’m an engineering student in computer science and telecommunications in Polytechnic School of Thies .I’m anenthusiast in Software Development essentially in Web Development & mobile development. I like also doing search in machine learning and globally in the new computer science technologies to be aware in what is doing right now in this field"
};
const TESTIMONIAL_DATA = {
  header: "What clients say?",
  TESTIMONIAL_LIST: [{
      DESCRIPTION: "Nixalar has made a huge difference to our business with his good work and knowledge of SEO and business to business marketing techniques. Our search engine rankings are better than ever and we are getting more people contacting us thanks to Jomer’s knowledge and hard work.",
      IMAGE_URL: "images/user1.jpg",
      NAME: "Julia hawkins",
      DESIGNATION: "Co-founder at ABC"
    },
    {
      DESCRIPTION: "Nixalar and his team have provided us with a comprehensive, fast and well planned digital marketing strategy that has yielded great results in terms of content, SEO, Social Media. His team are a pleasure to work with, as well as being fast to respond and adapt to the needs of your brand.",
      IMAGE_URL: "images/user2.jpg",
      NAME: "John Smith",
      DESIGNATION: "Co-founder at xyz"
    }
  ]
};

const SOCIAL_DATA = {
  header: "Find us on social media",
  IMAGES_LIST: [
    "images/facebook-icon.png",
    "images/instagram-icon.png",
    "images/whatsapp-icon.png",
    "images/twitter-icon.png",
    "images/linkedin-icon.png",
    "images/snapchat-icon.png"
  ]
};

const FOOTER_DATA = {
  DESCRIPTION: "We are typically focused on result-based maketing in the digital world. Also, we evaluate your brand’s needs and develop a powerful strategy that maximizes profits.",
  CONTACT_DETAILS: {
    header: "Contact us",
    ADDRESS: "La trobe street docklands, Melbourne",
    MOBILE: "+1 61234567890",
    EMAIL: "nixalar@gmail.com"
  },
  SUBSCRIBE_NEWSLETTER: "Subscribe newsletter",
  SUBSCRIBE: "Subscribe"
};

const MOCK_DATA = {
  HEADER,
  NAVBAR_DATA,
  BANNER_DATA,
  SOCIAL_MEDIA,
  SERVICE_DATA,
  ABOUT_DATA,
  TESTIMONIAL_DATA,
  SOCIAL_DATA,
  FOOTER_DATA,
  SKILLS
};
export default MOCK_DATA;