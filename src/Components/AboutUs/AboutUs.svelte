<script>
  export let ABOUT = {};
</script>

<!--================ Start About Us Area =================-->
<section id="about-us" class="about_area section_gap">
  <div class="container">
    <div class="row justify-content-start align-items-center">
      <div class="col-lg-5">
        <div class="about_img">
          <img class="" src="img/about-us.png" alt="" />
        </div>
      </div>

      <div class="offset-lg-1 col-lg-5">
        <div class="main_title text-left">
          <p class="top_text">
            {ABOUT.header}
            <span />
          </p>
          <h2>{ABOUT.title}</h2>
          <p>{ABOUT.content}</p>
          <a class="primary_btn" href="kairemor_resume_new.pdf">
            <span>Download CV</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
<!--================ End About Us Area =================-->
