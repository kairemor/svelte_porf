<script>
  export let navlists = [];
  export let socials = [];
</script>

<!--================Footer Area =================-->
<footer class="footer_area">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-12">
        <div class="footer_top flex-column">
          <div class="footer_logo">
            <a href="/">
              <img src="img/logo2.png" alt="" />
            </a>
            <div class="d-lg-block d-none">
              <nav
                class="navbar navbar-expand-lg navbar-light
                justify-content-center">
                <div class="collapse navbar-collapse offset">
                  <ul class="nav navbar-nav menu_nav mx-auto">
                    {#each navlists as nav}
                      <li class="nav-item">
                        <a class="nav-link text-white" href={nav.url}>
                          {nav.label}
                        </a>
                      </li>
                    {/each}
                  </ul>
                </div>
              </nav>
            </div>
          </div>
          <div class="footer_social mt-lg-0 mt-4">
            {#each socials as social}
              <a href={social.url}>
                <i class={social.icon} />
              </a>
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class="row footer_bottom justify-content-center">
      <p class="col-lg-8 col-sm-12 footer-text">
        <!-- Link back to Colorlib can't be removed. Template is licensed under CC BY 3.0. -->
        Copyright &copy;
        <script>
          document.write(new Date().getFullYear());
        </script>
        All rights reserved | This is made with
        <i class="fa fa-heart" aria-hidden="true" />
        by
        <a href="https://colorlib.com" target="_blank">Colorlib</a>
        <!-- Link back to Colorlib can't be removed. Template is licensed under CC BY 3.0. -->
      </p>
    </div>
  </div>
</footer>
<!--================End Footer Area =================-->
