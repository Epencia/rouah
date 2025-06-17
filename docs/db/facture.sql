-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : sam. 14 juin 2025 à 01:10
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
-- Structure de la table `facture`
--

DROP TABLE IF EXISTS `facture`;
CREATE TABLE IF NOT EXISTS `facture` (
  `code` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `numero` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `titre` varchar(300) COLLATE utf8mb4_general_ci NOT NULL,
  `client` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `telephone` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `date` date NOT NULL,
  `lieu` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `montant_chiffre` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `montant_lettre` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `avance` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `reste` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `utilisateur_id` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `carte_id` varchar(300) COLLATE utf8mb4_general_ci NOT NULL,
  `etat` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
