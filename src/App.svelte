<script>
  import Navbar from "./Components/Navbar/Navbar.svelte";
  import Banner from "./Components/Banner/Banner.svelte";
  import Statistique from "./Components/Banner/Statistique.svelte";
  import AboutUs from "./Components/AboutUs/AboutUs.svelte";
  import Service from "./Components/Service/Service.svelte";
  import Project from "./Components/Project/Project.svelte";
  import Footer from "./Components/Footer/Footer.svelte";
  import Skills from "./Components/Skills/Skills.svelte";
  import Porfolio from "./Components/Porfolio/Porfolio.svelte";
  import Contact from "./Components/Contact/Contact.svelte";

  import DATA from "./Data/data.js";
</script>

<style global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
</style>

<main>
  <!-- Navbar -->
  <Navbar navlists={DATA.NAVBAR_DATA} headers={DATA.HEADER} />

  <Banner BANNER={DATA.BANNER_DATA} skills={DATA.SKILLS} />

  <AboutUs ABOUT={DATA.ABOUT_DATA} />

  <Service />

  <Porfolio />
  <Contact />
  <Footer navlists={DATA.NAVBAR_DATA} socials={DATA.SOCIAL_MEDIA} />
</main>
