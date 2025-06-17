-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : mar. 17 juin 2025 à 01:20
-- Version du serveur : 8.2.0
-- Version de PHP : 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `cloud`
--

-- --------------------------------------------------------

--
-- Structure de la table `carte`
--

DROP TABLE IF EXISTS `carte`;
CREATE TABLE IF NOT EXISTS `carte` (
  `numero_carte` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nom_prenom_carte` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `date_naissance_carte` date NOT NULL,
  `lieu_naissance_carte` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `sexe_carte` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `nationalite_carte` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `telephone_carte` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email_carte` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `profession_carte` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type_carte` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `formule_carte` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `solde_carte` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `adresse_carte` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `matricule` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `carte_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `societe_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `etat_carte` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`numero_carte`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `carte`
--

INSERT INTO `carte` (`numero_carte`, `nom_prenom_carte`, `date_naissance_carte`, `lieu_naissance_carte`, `sexe_carte`, `nationalite_carte`, `telephone_carte`, `email_carte`, `profession_carte`, `type_carte`, `formule_carte`, `solde_carte`, `adresse_carte`, `matricule`, `carte_id`, `societe_id`, `etat_carte`) VALUES
('CLIENT0001', 'Souangah Serge', '0000-00-00', '', '', '', '0909090909', 'infoseric35@gmail.com', '', 'Secondaire', '', '23000', '11 BP 2025 ABIDJAN 11 / 0709107849', '', 'CLIENT0002', 'SOCIETE001', 'Actif'),
('CLIENT0002', 'Coulibali Orokia', '0000-00-00', '', '', '', '0509090909', '', '', 'Principal', '', '', '', '', '', 'SOCIETE001', 'En cours'),
('SOCIETE00001235015', 'Fournisseur 1', '0000-00-00', '', '', NULL, '0709107849', 'infoseric35@gmail.com', NULL, 'Fournisseur', NULL, NULL, '11 BP 2025 ABIDJAN 11 / 0709107849', NULL, NULL, 'SOCIETE001', 'Actif'),
('SOCIETE001251003181859', 'Yao Elysée', '0000-00-00', '', '', NULL, '0151401390', '', NULL, 'Client', NULL, NULL, '', NULL, NULL, 'SOCIETE001', ''),
('SOCIETE001252503201820', 'TEST', '0000-00-00', '', '', NULL, '', '', NULL, 'Patient', NULL, NULL, '', NULL, NULL, 'SOCIETE001', 'Actif');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
