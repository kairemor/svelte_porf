<script>
  import Navbar from "./Components/Navbar/Navbar.svelte";
  import Banner from "./Components/Banner/Banner.svelte";
  import Statistique from "./Components/Banner/Statistique.svelte";
  import AboutUs from "./Components/AboutUs/AboutUs.svelte";
  import Project from "./Components/Project/Project.svelte";
  // import Social from "./Components/Social/Social.svelte";
  import Footer from "./Components/Footer/Footer.svelte";

  import DATA from "./Data/data.js";
</script>

<style>

</style>

<main>
  <!-- Navbar -->
  <Navbar navlists={DATA.NAVBAR_DATA} headers={DATA.HEADER} />
  <!-- Banner -->
  <Banner BANNER={DATA.BANNER_DATA} socials={DATA.SOCIAL_MEDIA} />
  <Statistique < />
  <!-- About -->
  <AboutUs ABOUT={DATA.ABOUT_DATA} />
  <!-- Footer -->
  <Project />
  <Footer />
</main>
