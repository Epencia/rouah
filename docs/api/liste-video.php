<?php
date_default_timezone_set('UTC');
require '../database/database.php';

if(isset($_GET['code']))
	{ 
$req = $con->prepare('SELECT * FROM video WHERE playlist=:code');
$req->bindParam(':code', $_GET['code']);
        $req->execute();
        $sol = $req->fetchAll();

        print_r(json_encode($sol));

   }


?>