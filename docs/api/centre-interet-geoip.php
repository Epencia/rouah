<?php
date_default_timezone_set('UTC');
require '../database/database.php';

if(isset($_GET['matricule']))
	{ 

$req = $con->prepare("SELECT
    u.id AS utilisateur_id,
    u.matricule,
    u.nom_prenom,
    u.login,
    TO_BASE64(u.photo) AS photo64,
    u.type,
    COALESCE(
        (SELECT g.latitude FROM geolocalisation g WHERE g.utilisateur_id = u.id ORDER BY g.id_geoip DESC LIMIT 1),
        7.67153
    ) AS latitude,
    COALESCE(
        (SELECT g.longitude FROM geolocalisation g WHERE g.utilisateur_id = u.id ORDER BY g.id_geoip DESC LIMIT 1),
        -5.016361
    ) AS longitude,
    GROUP_CONCAT(DISTINCT ci_other.titre_interet SEPARATOR ', ') AS interets_communs_titres,
    GROUP_CONCAT(DISTINCT ci_other.categorie_id SEPARATOR ', ') AS interets_communs_categories,
    COUNT(DISTINCT ci_other.code_interet) AS nb_interets_communs_detectes
FROM
    utilisateur u
INNER JOIN
    centre_interet ci_other ON u.matricule = ci_other.utilisateur_id
WHERE
    u.matricule != :matricule
    AND (
        EXISTS (
            SELECT 1
            FROM centre_interet ci_current
            WHERE ci_current.utilisateur_id = (SELECT id FROM utilisateur WHERE matricule = :matricule)
              AND (
                    LOWER(ci_other.titre_interet) LIKE CONCAT('%', LOWER(ci_current.titre_interet), '%')
                 OR LOWER(ci_current.titre_interet) LIKE CONCAT('%', LOWER(ci_other.titre_interet), '%')
                  )
        )
        OR
        EXISTS (
            SELECT 1
            FROM centre_interet ci_current
            WHERE ci_current.utilisateur_id = (SELECT id FROM utilisateur WHERE matricule = :matricule)
              AND (
                    LOWER(ci_other.categorie_id) LIKE CONCAT('%', LOWER(ci_current.categorie_id), '%')
                 OR LOWER(ci_current.categorie_id) LIKE CONCAT('%', LOWER(ci_other.categorie_id), '%')
                  )
        )
        OR
        EXISTS (
            SELECT 1
            FROM centre_interet ci_current,
                 (
                    SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(ci_current_sub.titre_interet, ',', n.digit+1), ',', -1)) AS keyword
                    FROM centre_interet ci_current_sub
                    INNER JOIN (
                        SELECT 0 digit UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
                    ) n ON LENGTH(ci_current_sub.titre_interet) - LENGTH(REPLACE(ci_current_sub.titre_interet, ',', '')) >= n.digit
                    WHERE ci_current_sub.utilisateur_id = (SELECT id FROM utilisateur WHERE matricule = :matricule)
                 ) AS keywords_from_user_current
            WHERE ci_current.utilisateur_id = (SELECT id FROM utilisateur WHERE matricule = :matricule)
              AND LOWER(ci_other.titre_interet) LIKE CONCAT('%', LOWER(keywords_from_user_current.keyword), '%')
        )
        OR
        EXISTS (
            SELECT 1
            FROM centre_interet ci_current,
                 (
                    SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(ci_current_sub.categorie_id, ',', n.digit+1), ',', -1)) AS keyword
                    FROM centre_interet ci_current_sub
                    INNER JOIN (
                        SELECT 0 digit UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
                    ) n ON LENGTH(ci_current_sub.categorie_id) - LENGTH(REPLACE(ci_current_sub.categorie_id, ',', '')) >= n.digit
                    WHERE ci_current_sub.utilisateur_id = (SELECT id FROM utilisateur WHERE matricule = :matricule)
                 ) AS keywords_from_user_current
            WHERE ci_current.utilisateur_id = (SELECT id FROM utilisateur WHERE matricule = :matricule)
              AND LOWER(ci_other.categorie_id) LIKE CONCAT('%', LOWER(keywords_from_user_current.keyword), '%')
        )
    )
GROUP BY
    u.id, u.matricule
ORDER BY
    nb_interets_communs_detectes DESC");
        $req->bindParam(':matricule', $_GET['matricule']);
        $req->execute();
        $sol = $req->fetchAll();

        print_r(json_encode($sol));
      
}

 ?>