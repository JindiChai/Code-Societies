$(window).on("load", function() {
    $("#loader").hide();

    $("#selfVideo").on("click", function() {
        console.log($("#video1"));
        $("#video1").css("top", "24vh");
        console.log("clicked");
    });

    $("#close").on("click", function() {
        console.log($("#video1"));
        $("#video1").css("top", "100vh");
        console.log("clicked");
    });

    $("main").on("click", function() {
        $(this).toggleClass("active");
        $("body").toggleClass("active-mode");
      });
    
});
