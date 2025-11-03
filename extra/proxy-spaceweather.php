<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/html; charset=utf-8");

$url = "https://www.spaceweatherlive.com/en/auroral-activity/aurora-forecast.html";
echo file_get_contents($url);
?>
