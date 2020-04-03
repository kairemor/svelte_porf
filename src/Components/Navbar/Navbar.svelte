<script>
  export let navlists = [];
  export let header = {};
</script>

<!--================ Start Header Area =================-->
<header class="header_area">
  <div class="main_menu">
    <nav class="navbar navbar-expand-lg navbar-light">
      <div class="container">
        <!-- Brand and toggle get grouped for better mobile display -->
        <a class="navbar-brand logo_h" href="/">
          <img src={header.img} alt={header.alt} />
        </a>
        <a class="navbar-brand logo_inner_page" href="/">
          <img src="img/logo2.png" alt="" />
        </a>
        <button
          class="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation">
          <span class="icon-bar" />
          <span class="icon-bar" />
          <span class="icon-bar" />
        </button>
        <!-- Collect the nav links, forms, and other content for toggling -->
        <div
          class="collapse navbar-collapse offset"
          id="navbarSupportedContent">
          <ul class="nav navbar-nav menu_nav">
            {#each navlists as nav}
              <li class="nav-item">
                <a class="nav-link" href={nav.url}>{nav.label}</a>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </nav>
  </div>
</header>
<!--================ End Header Area =================-->
