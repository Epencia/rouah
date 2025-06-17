<?php
date_default_timezone_set('UTC'); 
require '../database/database.php';

try {
$req = $con->prepare('SELECT 
    categorie.code,
    categorie.titre,
    categorie.etat,
    categorie.type,
    TO_BASE64(categorie.photo) AS photo64,
    COUNT(DISTINCT formation.id_formation) AS nombre FROM categorie LEFT JOIN formation ON formation.categorie = categorie.code GROUP BY categorie.code');
        $req->execute();
        $sol = $req->fetchAll(PDO::FETCH_ASSOC);

        print_r(json_encode($sol));
} catch (PDOException $e) {
    echo "Erreur de base de données : " . $e->getMessage();
}
      
?>