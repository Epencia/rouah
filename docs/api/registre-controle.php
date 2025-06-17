<?php
date_default_timezone_set('UTC');
require '../database/database.php';

 // decoding the received JSON and store into $obj variable.
     $json = file_get_contents('php://input');
     $obj = json_decode($json,true);



$req = $con->prepare('SELECT * FROM registre_controle WHERE matricule=:matricule');
        $req->bindParam(':matricule', $obj['matricule']);
        $req->execute();
        $sol = $req->fetchAll();

        if (!empty($sol)) {

                
                $matricule = $sol[0]['matricule'];
                $nom_prenom = $sol[0]['nom_prenom'];
                $date_naissance = $sol[0]['date_naissance'];
                $lieu_naissance = $sol[0]['lieu_naissance'];
                $date_debut = $sol[0]['date_debut'];
                $date_fin = $sol[0]['date_fin'];
                $telephone = $sol[0]['telephone'];
                $diplome = $sol[0]['diplome'];
                $domaine = $sol[0]['domaine'];
                $categorie = $sol[0]['categorie'];
                $societe = $sol[0]['societe'];
                $etat = $sol[0]['etat'];
                


                // STAGE
                if($sol[0]['categorie']=="Stage")
                {
                    if($sol[0]['etat']=="Actif"){
                $message = "<p style='color:green'>Félicitation $nom_prenom. Vous êtes un stagiaire de l'entreprise $societe et vous avez fini le stage. </p><p style='color:black;text-align:justify'> MATRICULE : $matricule </br> Né(e) le  $date_naissance à $lieu_naissance </br> CYCLE : $diplome </br> FILIÈRE : $domaine</br> PÉRIODE DE STAGE : Du  $date_debut  au  $date_fin</p><p style='color:blue;text-align:justify'> Pour plus de renseignements, veuillez contacter l'entreprise au +225 0709107849 (Appel, SMS, WhatsApp) ou par email sur adores.cloud@gmail.com</p>";

                }
                // en cours
                if($sol[0]['etat']=="En cours"){
                $message = "<p style='color:orange;font-weight:bold'>Bienvenue $nom_prenom. Vous êtes toujours en stage au sein de l'entreprise $societe. </p><p style='color:black;text-align:justify'> MATRICULE : $matricule </br>  Né(e) le  $date_naissance à $lieu_naissance </br> CYCLE : $diplome </br> FILIÈRE : $domaine </br> PÉRIODE DE STAGE : Du  $date_debut  au  $date_fin</p><p style='color:blue;text-align:justify'> Pour plus de renseignements, veuillez contacter l'entreprise au +225 0709107849 (Appel, SMS, WhatsApp) ou par email sur adores.cloud@gmail.com</p>";
                }
                // refusé
                if($sol[0]['etat']=="Inactif"){
                $message = "<p style='color:red'>Désolé ! Vous n'êtes pas un stagiaire de l'entreprise.</p><p style='color:blue;text-align:justify'> Pour plus de renseignements, veuillez contacter l'entreprise au +225 0709107849 (Appel, SMS, WhatsApp) ou par email sur adores.cloud@gmail.com</p>";
                }
                }
                if($sol[0]['categorie']=="Formation"){
                    // validé
                 if($sol[0]['etat']=="Actif"){
                $message = "<p style='color:green'>Félicitation $nom_prenom. Vous avez validé une formation avec l'entreprise $societe. </p><p style='color:black;text-align:justify'> MATRICULE : $matricule </br> Né(e) le $date_naissance à $lieu_naissance </br> DIPLÔME : $diplome </br> MODULE : $domaine</p><p style='color:blue;text-align:justify'> Pour plus de renseignements, veuillez contacter l'entreprise au +225 0709107849 (Appel, SMS, WhatsApp) ou par email sur adores.cloud@gmail.com</p>";
                }
                // en cours
                if($sol[0]['etat']=="En cours"){
                $message = "<p style='color:orange;font-weight:bold'>Bienvenue $nom_prenom. Vous avez une formation en cours qui n'a pas encore été validé par l'entreprise $societe. </p><p style='color:black;text-align:justify'> MATRICULE : $matricule </br>  Né(e) le  $date_naissance à $lieu_naissance </br> DIPLÔME : $diplome </br> MODULE : $domaine</p><p style='color:blue;text-align:justify'> Pour plus de renseignements, veuillez contacter l'entreprise au +225 0709107849 (Appel, SMS, WhatsApp) ou par email sur adores.cloud@gmail.com</p>";
                }
                // refusé
                if($sol[0]['etat']=="Inactif"){
                $message = "<p style='color:red'>Désolé ! Vous n'avez aucune formation ou diplôme avec l'entreprise $societe.</p><p style='color:blue;text-align:justify'> Pour plus de renseignements, veuillez contacter l'entreprise au +225 0709107849 (Appel, SMS, WhatsApp) ou par email sur adores.cloud@gmail.com</p>";
                }

                }

                
            } else {


                $message = "<p style='color:red'>Désolé ! Votre identifiant ou matricule n'est pas enregistré dans notre base de données.</p><p style='color:blue;text-align:justify'> Pour plus de renseignements, veuillez contacter l'entreprise au +225 0709107849 (Appel, SMS, WhatsApp) ou par email sur adores.cloud@gmail.com</p>";
            }

        print_r(json_encode($message));
      


 ?>