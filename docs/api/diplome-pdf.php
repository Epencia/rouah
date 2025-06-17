<?php
date_default_timezone_set('UTC');
require '../database/database.php';

if(isset($_GET['matricule']))
  { 

$req = $con->prepare('SELECT carte.numero_carte,carte.nom_prenom_carte,carte.date_naissance_carte,certificat.*,formation.titre_formation,formation.diplome FROM certificat,formation,carte WHERE carte.numero_carte=certificat.carte_id AND formation.id_formation=certificat.formation_id AND certificat.code_certificat=:matricule');
        $req->bindParam(':matricule', $_GET['matricule']);
        $req->execute();
        $sol = $req->fetchAll();

        if(!empty($sol)){

 ?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Adorès | <?php echo $sol[0]['diplome']; ?></title>
  <style>
    body {
      font-family: 'Georgia', serif;
      background-color: #f9f9f9;
      margin: 0;
      padding: 40px;
      color: #333;
    }

    .certificate {
      border: 8px double #4A90E2;
      padding: 40px;
      background: white;
      max-width: 800px;
      margin: auto;
      text-align: center;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 30px;
    }

    .header img {
      max-width: 100px;
      height: auto;
    }

    .header h1 {
      font-size: 40px;
      margin: 0;
      color: #2c3e50;
    }

    h2 {
      font-size: 22px;
      font-weight: normal;
      margin-top: 40px;
      margin-bottom: 10px;
    }

    .name {
      font-size: 28px;
      font-weight: bold;
      margin: 20px 0;
    }

    .details {
      font-size: 18px;
      margin: 10px 0;
    }

    .footer {
      margin-top: 50px;
      font-size: 16px;
    }

    .signature {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .signature div {
      width: 45%;
      text-align: center;
      border-top: 1px solid #999;
      padding-top: 5px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <!-- Logo à gauche -->
      <img src="../assets/img/logo.png" alt="Logo de l'entreprise">
      <h1><?php echo $sol[0]['diplome']; ?></h1>
      <img src="../assets/img/logo.png" alt="Logo de l'entreprise">
    </div>

    <h2>Ce certificat est décerné à</h2>
    <div class="name"><?php echo $sol[0]['nom_prenom_carte']; ?></div>

    <div class="details">
      Pour avoir complété avec succès la formation :<br>
      <strong><?php echo $sol[0]['titre_formation']; ?></strong><br>
      Du  <strong><?php echo (new DateTime($sol[0]['date_debut']))->format('d-m-Y'); ?></strong> au  <strong><?php echo (new DateTime($sol[0]['date_fin']))->format('d-m-Y'); ?></strong>
    </div>

    <div class="footer">
      Certificat délivré le  <strong><?php echo (new DateTime($sol[0]['date_delivrance']))->format('d-m-Y'); ?></strong><br><br>
      Organisme de formation : <strong>MANDIGO S.A.R.L</strong><br><br>
      Code  : <strong><?php echo $sol[0]['code_certificat']; ?></strong>
    </div>

    <div class="signature">
      <div>Amany Christophe<br>Responsable Pédagogique</div>
      <div>Koffi Kouadio Eric<br>Directeur Général</div>
    </div>
  </div>
</body>
</html>
<?php         
}

}
 ?>