const WEB_URL = "https://safesale.localtunnel.me/";
const apiHelper = new APIHelper();
const renderer = new Renderer();
const storage = chrome.storage.sync;

var isLoading = false;
var seller_latitude = "";
var seller_longitude = "";

function APIHelper() {
    var self = this;

    this.sendPost = function(req_location, req_body, success_func, error_func) {
        $.ajax({
            type: 'POST',
            url: WEB_URL + req_location,
            data: JSON.stringify(req_body),
            contentType: "application/json",
            dataType: 'json',
            success: success_func,
            error: error_func
        });
    }

    this.loadData = function() {
        navigator.geolocation.getCurrentPosition(function(position) {

            var user_latitude = position.coords.latitude;
            var user_longitude = position.coords.longitude;

            storage.get({ 'transMode' : 'driving', 'radius' : 2, 'listSize' : 3 }, function(value) {
                // Send a request for data from remote server
                var req_data = {
                    location1: user_latitude + "," + user_longitude,
                    location2: seller_latitude + "," + seller_longitude,
                    radius: value.radius,
                    size: value.listSize,
                    mode: value.transMode
                };

                self.sendPost(
                        "api/location",
                        req_data,
                        function(data) {
                            console.log(data);
                            renderer.displayContent(data);
                        },
                        function(error) {
                            console.log(error);
                            var message = {
                                "text": "An error occurred, please try again later."
                            };
                            renderer.displayError(message);
                        }
                    );
                });

        });
    }

}

function Renderer() {
    var self = this;

    this.renderContent = function(source, context) {
        var template = Handlebars.compile(source);
        var html = (context != null) ? template(context) : template(context);
        $("#inject-display").html(html);

        $("#mapreload").off('click').on('click', function(e) {
            if(!isLoading) {
                renderer.displayLoading();
                apiHelper.loadData();
            }
        });
    }

    this.displayLoading = function() {
        var source = $("#loading").html();
        isLoading = true;
        self.renderContent(source, {});
    }

    this.displayContent = function(data) {
        var source = $("#items").html();
        isLoading = false;
        self.renderContent(source, data);

        $("#inject-display .item").click(function(){
            window.open($(this).data("href"));
            $(this).removeClass( "grow" );
        });
        $("#inject-display .item").mouseenter(function() {
            $(this).addClass( "grow" );
        }).mouseleave(function() {
            $(this).removeClass( "grow" );
        });
    }

    this.displayError = function(data) {
        var source = $("#error").html();
        isLoading = false;
        self.renderContent(source, data);
    }

}

$(document).ready(function() {

    if (!$("span#titletextonly").length || !$(".mapbox").length) {
        return;
    }

    // Get the lat / long of the ad's location
    var maps_box = document.getElementById("map");
    seller_latitude = maps_box.dataset.latitude;
    seller_longitude = maps_box.dataset.longitude;

    // Load the HTML responsible for displaying the locations to the display
    var data = {};
    data.bodyText = "<div id=\"injection\"></div>"; 
    $(".mapbox").append(data.bodyText);
    $("#injection").load(chrome.extension.getURL("injected/inject.html"), renderer.displayLoading);

    // Initial Load
    apiHelper.loadData();

});

