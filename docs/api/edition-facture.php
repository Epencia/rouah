<?php
date_default_timezone_set('UTC'); 
require '../database/database.php';

$json = file_get_contents('php://input');

     // decoding the received JSON and store into $obj variable.
$obj = json_decode($json,true);

     // variable
$code = $obj['code'];
$numero = $obj['numero'];
$titre = $obj['titre'];  
$date = $obj['date'];
$lieu = $obj['lieu'];
$montant = $obj['montant'];
$avance = $obj['avance'];
$reste = $obj['reste'];
$telephone = $obj['telephone'];
$client = $obj['client'];
$utilisateur_id = $obj['utilisateur_id'];
$carte_id = $obj['carte_id'];
$etat = $obj['etat'];

    // conversion
if (is_numeric($obj['montant'])) {
    $parts = explode('.', $obj['montant']);
    $lettre = $formatter->format($pautilisateur_idrts[0]);
    if (isset($parts[1]) && (int)$parts[1] > 0) {
        $lettre .= ' virgule ' . $formatter->format($parts[1]);
    }
    $montant_lettre = ucfirst($lettre);
} else {
    $montant_lettre = $obj['montant'];
}

      // generateur de code 


$req = $con->prepare('SELECT * FROM carte WHERE numero_carte=:numero_carte');
$req->bindParam(':numero_carte', $matricule);
$req->execute();
$verifCarte = $req->fetchAll();

if(!empty($verifCarte)){

    if($verifCarte[0]['etat_carte']=="Actif"){

        $req = $con->prepare('SELECT * FROM facture WHERE code=:code');
        $req->bindParam(':code', $code);
        $req->execute();
        $verifFacture = $req->fetchAll();

        if(empty($verifFacture)){

            $req = $con->prepare('INSERT INTO facture  VALUES (
                :code, :numero, :titre, :client, :telephone, :date, :lieu,
                :montant_chiffre, :montant_lettre, :avance, :reste,
                :utilisateur_id, :carte_id, :etat
            )');
            $req->bindParam(':code', $code);
            $req->bindParam(':numero', $numero);
            $req->bindParam(':titre', $titre);
            $req->bindParam(':client', $client);
            $req->bindParam(':telephone', $telephone);
            $req->bindParam(':date', $date);
            $req->bindParam(':lieu', $lieu);
            $req->bindParam(':montant_chiffre', $montant_chiffre);
            $req->bindParam(':montant_lettre', $montant_lettre);
            $req->bindParam(':avance', $avance);
            $req->bindParam(':reste', $reste);
            $req->bindParam(':utilisateur_id', $utilisateur_id);
            $req->bindParam(':carte_id', $carte_id);
            $req->bindParam(':etat', $etat);

            $exec = $req->execute();


            if ($exec== true) {

                $message ="Facture créee avec succès ! ";
            } else {

                $message ="Echec de la création de la facture. ! ";
            }


        }else{


            $req = $con->prepare('UPDATE facture SET 
                titre = :titre,
                client = :client,
                telephone = :telephone,
                date = :date,
                lieu = :lieu,
                montant_chiffre = :montant_chiffre,
                montant_lettre = :montant_lettre,
                avance = :avance,
                reste = :reste,
                utilisateur_id = :utilisateur_id,
                carte_id = :carte_id,
                etat = :etat
                WHERE code = :code');
            $req->bindParam(':code', $code);
            $req->bindParam(':titre', $titre);
            $req->bindParam(':client', $client);
            $req->bindParam(':telephone', $telephone);
            $req->bindParam(':date', $date);
            $req->bindParam(':lieu', $lieu);
            $req->bindParam(':montant_chiffre', $montant_chiffre);
            $req->bindParam(':montant_lettre', $montant_lettre);
            $req->bindParam(':avance', $avance);
            $req->bindParam(':reste', $reste);
            $req->bindParam(':utilisateur_id', $utilisateur_id);
            $req->bindParam(':carte_id', $carte_id);
            $req->bindParam(':etat', $etat);

            $exec = $req->execute();


            if ($exec== true) {

                $message ="Facture modifiée avec succès ! ";
            } else {

                $message ="Echec de la modification de la facture. ! ";
            }
        }
    }else{
        $message ="Votre carte a été desactivée. ! ";
    }
}else{
    $message ="Votre carte n'existe pas. ! ";
}




print_r(json_encode($message));



?>