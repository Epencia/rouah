<?php
date_default_timezone_set('UTC');
require '../database/database.php';

if(isset($_GET['commune']))
	{ 

$req = $con->prepare('SELECT * FROM evenement WHERE commune_id=:commune');
        $req->bindParam(':commune', $_GET['commune']);
        $req->execute();
        $sol = $req->fetchAll();

        print_r(json_encode($sol));
      
}

 ?>
