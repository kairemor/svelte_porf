<script>
  import ProgressBar from "@okrad/svelte-progressbar";

  // export let series = [23, 34];
</script>

<section>
  <div class="container">
    <div class="row">
      <div class="col-lg-12">
        <div class="main_title">
          <p class="top_text">
            My Skills
            <span />
          </p>
          <h2>My Skills</h2>
        </div>
        <div class="flex flex-row">
          <ProgressBar
            class="text-gray-700 text-center bg-gray-400 px-4 py-2 m-2 mx-5"
            series={34}
            color={'red'} />
          <ProgressBar
            class="text-gray-700 text-center bg-gray-400 px-4 py-2 m-2"
            series={54} />
          <ProgressBar
            class="text-gray-700 text-center bg-gray-400 px-4 py-2 m-2"
            series={32} />

          <iframe
            title={'Covid19'}
            src="http://covid19kashmoard.us-west-2.elasticbeanstalk.com/" />
        </div>
      </div>
    </div>
  </div>
</section>
