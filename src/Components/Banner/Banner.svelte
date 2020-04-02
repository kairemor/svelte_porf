<script>
  export let BANNER = {};
  export let socials = [];
</script>

<!--================ Start Home Banner Area =================-->
<section class="home_banner_area">
  <div class="banner_inner">
    <div class="container">
      <div class="row align-items-center justify-content-between">
        <div class="col-lg-6">
          <div class="banner_content">
            <h1 class="text-uppercase">{BANNER.header}</h1>
            <h5 class="text-uppercase">{BANNER.description}</h5>
            <div class="social_icons my-5">
              {#each socials as social}
                <a href={social.url}>
                  <i class={social.icon} />
                </a>
              {/each}
            </div>
            <a class="primary_btn" href="/it">
              <span>See My Work</span>
            </a>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="home_right_img">
            <img class="img-fluid" src="img/banner/home-right.png" alt="" />
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<!--================ End Home Banner Area =================-->
