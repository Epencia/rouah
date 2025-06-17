<?php
date_default_timezone_set('UTC');
require '../database/database.php';

if(isset($_GET['matricule']))
        { 

$req = $con->prepare('SELECT certificat.*,formation.titre_formation,formation.diplome FROM certificat,formation WHERE formation.id_formation=certificat.formation_id AND (certificat.utilisateur_id=:matricule OR certificat.carte_id=:matricule)');
        $req->bindParam(':matricule', $_GET['matricule']);
        $req->execute();
        $sol = $req->fetchAll();

        print_r(json_encode($sol));
      
}

 ?>