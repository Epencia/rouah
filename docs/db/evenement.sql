-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : mar. 17 juin 2025 à 01:23
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
-- Structure de la table `evenement`
--

DROP TABLE IF EXISTS `evenement`;
CREATE TABLE IF NOT EXISTS `evenement` (
  `code_evenement` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `titre_evenement` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type_evenement` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lieu_evenement` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date_evenement` date DEFAULT NULL,
  `horaire_evenement` text COLLATE utf8mb4_general_ci,
  `description_evenement` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `vue_evenement` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `utilisateur_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `commune_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `etat_evenement` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`code_evenement`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `evenement`
--

INSERT INTO `evenement` (`code_evenement`, `titre_evenement`, `type_evenement`, `lieu_evenement`, `date_evenement`, `horaire_evenement`, `description_evenement`, `vue_evenement`, `utilisateur_id`, `commune_id`, `etat_evenement`) VALUES
('001', 'CONCERT', 'DIVERTISEMENT', 'STADE DE BOUAKE', '2025-06-12', '08H 12H', 'Un concert de Didi B a eu lieu le 12 juin au stade de bouake ', '100', NULL, 'bouake', NULL),
('002', 'Journée Carriere', 'Professionnel', 'Air France 2', '2025-06-13', 'IDEM', 'hjddjkdskjdk\r\nnbxbjbcdbj\r\nvjsdhbjdchbd', '6780', NULL, 'Bouake', NULL),
('003', 'Sortie detente', 'DIVERTISEMENT', 'Petit marche', '2025-06-12', '08H 12H', 'Un concert de Didi B a eu lieu le 12 juin au stade de bouake ', NULL, NULL, 'katiola', NULL),
('004', 'Piscine a Gogo', 'Detente', 'Katiola 2 et 3', '2025-06-13', 'IDEM', 'hjddjkdskjdk\r\nnbxbjbcdbj\r\nvjsdhbjdchbd', NULL, NULL, 'katiola', NULL);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
