<?php
date_default_timezone_set('UTC'); 
require '../database/database.php';

if(isset($_GET['categorie']))
        { 
$req = $con->prepare('SELECT 
    formation.id_formation,
    formation.titre_formation,
    formation.prix_formation,
    formation.diplome,
    formation.details_formation,
    formation.etat_formation,
    formation.categorie,
    formation.type,
    TO_BASE64(formation.photo) AS photo64,
    COUNT(DISTINCT video.id_video) AS NombreVideo
FROM 
    formation
LEFT JOIN 
    video ON formation.id_formation = video.playlist
WHERE 
formation.categorie=:categorie
GROUP BY 
    formation.id_formation');
        $req->bindParam(':categorie', $_GET['categorie']);
        $req->execute();
        $sol = $req->fetchAll();

        print_r(json_encode($sol));
}
      
?>