/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.9-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: loja_online
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `loja_online`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `loja_online` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `loja_online`;

--
-- Table structure for table `carrinho`
--

DROP TABLE IF EXISTS `carrinho`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `carrinho` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `produto_id` int(11) DEFAULT NULL,
  `variacao_id` int(11) DEFAULT NULL,
  `quantidade` int(11) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `produto_id` (`produto_id`),
  KEY `variacao_id` (`variacao_id`),
  CONSTRAINT `carrinho_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `carrinho_ibfk_2` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`),
  CONSTRAINT `carrinho_ibfk_3` FOREIGN KEY (`variacao_id`) REFERENCES `produto_variacoes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carrinho`
--

LOCK TABLES `carrinho` WRITE;
/*!40000 ALTER TABLE `carrinho` DISABLE KEYS */;
/*!40000 ALTER TABLE `carrinho` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES
(1,'Blusas e Cropped'),
(2,'Body'),
(3,'Short e Bermuda'),
(5,'Saia e Short Saia'),
(6,'Macaquinho'),
(7,'Vestidos'),
(8,'Conjuntos'),
(9,'Calças'),
(10,'Sandália'),
(11,'Bolsa e Acessórios'),
(12,'Jaquetas');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favoritos`
--

DROP TABLE IF EXISTS `favoritos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `favoritos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `produto_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_favorito` (`usuario_id`,`produto_id`),
  KEY `produto_id` (`produto_id`),
  CONSTRAINT `favoritos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `favoritos_ibfk_2` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favoritos`
--

LOCK TABLES `favoritos` WRITE;
/*!40000 ALTER TABLE `favoritos` DISABLE KEYS */;
/*!40000 ALTER TABLE `favoritos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedido_itens`
--

DROP TABLE IF EXISTS `pedido_itens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedido_itens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pedido_id` int(11) NOT NULL,
  `produto_id` int(11) NOT NULL,
  `variacao_id` int(11) DEFAULT NULL,
  `quantidade` int(11) NOT NULL,
  `preco` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `variacao_id` (`variacao_id`),
  KEY `idx_pedido_itens_pedido_id` (`pedido_id`),
  KEY `idx_pedido_itens_produto_id` (`produto_id`),
  CONSTRAINT `pedido_itens_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pedido_itens_ibfk_2` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`),
  CONSTRAINT `pedido_itens_ibfk_3` FOREIGN KEY (`variacao_id`) REFERENCES `produto_variacoes` (`id`),
  CONSTRAINT `chk_quantidade_positive` CHECK (`quantidade` > 0),
  CONSTRAINT `chk_preco_item_nonnegative` CHECK (`preco` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=125 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedido_itens`
--

LOCK TABLES `pedido_itens` WRITE;
/*!40000 ALTER TABLE `pedido_itens` DISABLE KEYS */;
INSERT INTO `pedido_itens` VALUES
(1,63,8,28,1,40.00),
(2,64,8,28,1,40.00),
(3,65,8,28,1,40.00),
(4,66,8,28,1,40.00),
(5,67,8,29,1,40.00),
(6,68,7,38,1,40.00),
(7,69,6,25,1,40.00),
(8,70,9,34,1,70.00),
(9,71,2,23,1,89.00),
(10,72,2,23,1,89.00),
(11,73,2,23,1,89.00),
(12,74,2,23,1,89.00),
(13,75,2,23,1,89.00),
(14,76,2,23,1,89.00),
(15,77,7,38,1,40.00),
(16,77,7,39,1,40.00),
(17,78,3,17,5,39.90),
(18,79,2,23,1,89.00),
(19,80,3,17,1,39.90),
(20,81,3,17,1,39.90),
(21,82,5,20,1,39.90),
(22,83,3,17,1,39.90),
(23,84,3,17,1,39.90),
(24,85,2,23,1,89.00),
(25,86,2,23,1,89.00),
(26,87,3,17,1,39.90),
(27,88,3,17,1,39.90),
(28,89,3,17,1,39.90),
(29,90,3,17,1,39.90),
(30,91,3,17,1,39.90),
(31,92,3,17,1,39.90),
(32,93,2,23,1,89.00),
(33,94,3,17,1,39.90),
(34,95,10,40,1,80.00),
(35,96,7,38,1,40.00),
(36,97,2,23,1,89.00),
(37,98,2,23,1,89.00),
(38,99,2,23,1,89.00),
(39,100,2,23,1,89.00),
(40,101,2,23,1,89.00),
(41,102,2,23,1,89.00),
(42,103,2,23,1,89.00),
(43,104,2,23,1,89.00),
(44,105,2,23,1,89.00),
(45,106,12,44,2,90.00),
(46,106,10,40,1,80.00),
(47,107,3,17,1,39.90),
(48,108,3,17,1,39.90),
(49,109,2,23,1,89.00),
(50,110,10,40,1,80.00),
(51,111,3,17,1,39.90),
(52,112,10,40,1,80.00),
(53,113,3,17,1,39.90),
(54,114,10,40,1,80.00),
(55,115,2,23,1,89.00),
(56,116,2,23,1,89.00),
(57,117,10,40,1,80.00),
(58,118,2,23,1,89.00),
(59,119,3,17,1,39.90),
(60,120,12,44,1,90.00),
(61,121,2,23,1,89.00),
(62,122,3,17,1,39.90),
(63,123,3,17,1,39.90),
(64,124,3,17,1,39.90),
(65,124,5,20,1,39.90),
(66,125,3,17,1,39.90),
(67,126,3,17,1,39.90),
(68,127,2,23,1,89.00),
(69,128,2,23,1,89.00),
(70,129,2,23,1,89.00),
(71,130,2,23,1,89.00),
(72,131,2,23,1,89.00),
(73,132,2,23,1,89.00),
(74,133,2,23,1,89.00),
(75,134,2,23,1,89.00),
(76,135,2,23,1,89.00),
(77,136,2,23,1,89.00),
(78,137,2,23,1,89.00),
(79,138,2,23,1,89.00),
(80,139,2,23,1,89.00),
(81,140,2,23,1,89.00),
(82,141,2,23,1,89.00),
(83,142,2,23,1,89.00),
(84,143,2,23,1,89.00),
(85,144,2,23,1,89.00),
(86,145,2,23,1,89.00),
(87,146,2,23,1,89.00),
(88,147,3,17,1,39.90),
(89,148,10,40,1,80.00),
(90,149,2,23,1,89.00),
(91,150,2,23,1,89.00),
(93,152,2,23,1,89.00),
(94,153,2,23,1,89.00),
(95,154,2,23,1,89.00),
(96,155,2,23,1,89.00),
(97,156,2,23,1,89.00),
(98,157,2,23,1,89.00),
(99,158,2,23,1,89.00),
(100,159,6,25,4,40.00),
(101,160,2,23,1,89.00),
(102,161,3,17,1,39.90),
(103,162,2,23,1,89.00),
(104,163,2,23,1,89.00),
(105,164,2,23,1,89.00),
(106,165,2,23,1,89.00),
(107,166,10,40,2,80.00),
(108,167,10,40,1,80.00),
(109,168,10,40,2,80.00),
(110,169,10,41,5,80.00),
(111,170,2,23,2,89.00),
(112,171,2,23,1,89.00),
(113,172,5,20,1,39.90),
(114,173,13,45,2,60.00),
(115,174,13,45,2,60.00),
(116,175,13,46,1,60.00),
(117,176,13,46,1,60.00),
(118,177,13,46,1,60.00),
(119,178,13,46,1,60.00),
(120,179,13,46,1,60.00),
(121,180,12,44,1,90.00),
(122,181,12,44,1,90.00),
(123,182,6,25,1,40.00),
(124,183,2,23,1,89.00);
/*!40000 ALTER TABLE `pedido_itens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `status` enum('','pendente','aguardando_confirmacao','pago','enviado','entregue','cancelado','expirado') DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `pagamento` varchar(50) DEFAULT 'pendente',
  `comprovante` varchar(255) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `pix_key` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pedidos_status_created_at` (`status`,`created_at`),
  KEY `idx_pedidos_usuario_status` (`usuario_id`,`status`),
  KEY `idx_pedidos_status_expires_at` (`status`,`expires_at`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chk_total_nonnegative` CHECK (`total` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=184 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES
(1,2,'expirado',150.00,'2026-06-27 22:52:40','pix',NULL,NULL,NULL),
(2,2,'expirado',150.00,'2026-06-27 22:53:34','pix',NULL,NULL,NULL),
(3,2,'expirado',150.00,'2026-06-27 23:07:07','pix',NULL,NULL,NULL),
(4,2,'expirado',150.00,'2026-06-27 23:07:12','pix',NULL,NULL,NULL),
(5,2,'expirado',150.00,'2026-06-27 23:07:13','whatsapp',NULL,NULL,NULL),
(6,2,'expirado',150.00,'2026-06-27 23:08:11','whatsapp',NULL,NULL,NULL),
(7,2,'expirado',150.00,'2026-06-27 23:28:49','pix',NULL,NULL,NULL),
(8,2,'expirado',150.00,'2026-06-27 23:29:21','whatsapp',NULL,NULL,NULL),
(9,2,'expirado',150.00,'2026-06-27 23:42:08','pix',NULL,NULL,NULL),
(10,2,'expirado',150.00,'2026-06-27 23:42:14','pix',NULL,NULL,NULL),
(11,2,'expirado',150.00,'2026-06-27 23:42:18','whatsapp',NULL,NULL,NULL),
(12,2,'expirado',40.00,'2026-06-27 23:44:17','pix',NULL,NULL,NULL),
(13,2,'expirado',40.00,'2026-06-27 23:46:22','pix',NULL,NULL,NULL),
(14,2,'expirado',40.00,'2026-06-27 23:46:45','pix',NULL,NULL,NULL),
(15,2,'expirado',40.00,'2026-06-27 23:54:12','pix',NULL,NULL,NULL),
(16,2,'expirado',40.00,'2026-06-27 23:54:19','whatsapp',NULL,NULL,NULL),
(17,2,'expirado',40.00,'2026-06-27 23:58:02','pix',NULL,NULL,NULL),
(18,2,'expirado',40.00,'2026-06-27 23:58:02','whatsapp',NULL,NULL,NULL),
(19,2,'expirado',40.00,'2026-06-27 23:58:18','whatsapp',NULL,NULL,NULL),
(20,2,'expirado',40.00,'2026-06-27 23:58:20','pix',NULL,NULL,NULL),
(21,2,'expirado',40.00,'2026-06-28 00:13:48','pix',NULL,NULL,NULL),
(22,2,'expirado',70.00,'2026-06-28 00:14:49','pix',NULL,NULL,NULL),
(23,2,'expirado',70.00,'2026-06-28 00:15:02','whatsapp',NULL,NULL,NULL),
(24,2,'expirado',70.00,'2026-06-28 00:15:34','pix',NULL,NULL,NULL),
(25,2,'expirado',70.00,'2026-06-28 03:13:06','pix',NULL,NULL,NULL),
(26,2,'expirado',70.00,'2026-06-28 03:25:32','pix',NULL,NULL,NULL),
(27,2,'expirado',70.00,'2026-06-28 03:34:15','pix',NULL,NULL,NULL),
(28,2,'expirado',70.00,'2026-06-28 03:48:01','pix',NULL,NULL,NULL),
(29,2,'expirado',70.00,'2026-06-28 03:59:44','pix',NULL,NULL,NULL),
(30,2,'expirado',70.00,'2026-06-28 04:05:56','pix',NULL,NULL,NULL),
(31,2,'expirado',70.00,'2026-06-28 04:07:05','whatsapp',NULL,NULL,NULL),
(32,2,'expirado',70.00,'2026-06-28 04:19:06','pix',NULL,NULL,NULL),
(33,2,'expirado',70.00,'2026-06-28 04:35:41','pix',NULL,NULL,NULL),
(34,2,'expirado',70.00,'2026-06-28 05:01:43','pix',NULL,NULL,NULL),
(35,2,'expirado',70.00,'2026-06-28 05:04:48','pix',NULL,NULL,NULL),
(36,2,'expirado',70.00,'2026-06-28 05:23:46','pix',NULL,NULL,NULL),
(37,2,'expirado',70.00,'2026-06-28 05:42:25','pix',NULL,NULL,NULL),
(38,2,'expirado',70.00,'2026-06-28 05:43:44','pix',NULL,NULL,NULL),
(39,2,'expirado',70.00,'2026-06-28 05:44:44','pix',NULL,NULL,NULL),
(40,2,'expirado',70.00,'2026-06-28 05:59:36','pix',NULL,NULL,NULL),
(41,2,'expirado',70.00,'2026-06-28 06:00:14','pix',NULL,NULL,NULL),
(42,2,'expirado',70.00,'2026-06-28 06:15:40','pix',NULL,NULL,NULL),
(43,2,'expirado',70.00,'2026-06-28 06:21:17','pix',NULL,NULL,NULL),
(44,2,'expirado',110.00,'2026-06-28 06:21:50','pix',NULL,NULL,NULL),
(45,2,'expirado',110.00,'2026-06-28 06:35:34','pix',NULL,NULL,NULL),
(46,2,'expirado',110.00,'2026-06-28 06:38:26','pix',NULL,NULL,NULL),
(47,2,'expirado',110.00,'2026-06-28 17:22:29','pix',NULL,NULL,NULL),
(48,2,'expirado',80.00,'2026-06-28 17:49:46','pix',NULL,NULL,NULL),
(49,2,'expirado',80.00,'2026-06-28 17:53:20','pix',NULL,NULL,NULL),
(50,2,'expirado',40.00,'2026-06-28 17:55:35','pix',NULL,NULL,NULL),
(51,2,'expirado',40.00,'2026-06-28 17:58:28','pix',NULL,NULL,NULL),
(52,2,'expirado',70.00,'2026-06-28 17:59:05','pix',NULL,NULL,NULL),
(53,2,'expirado',40.00,'2026-06-28 18:01:30','pix',NULL,NULL,NULL),
(54,2,'expirado',89.00,'2026-06-28 18:05:18','pix',NULL,NULL,NULL),
(55,2,'expirado',89.00,'2026-06-28 18:08:15','pix',NULL,NULL,NULL),
(56,2,'expirado',89.00,'2026-06-28 18:12:30','pix',NULL,NULL,NULL),
(57,2,'expirado',89.00,'2026-06-28 18:20:22','pix',NULL,NULL,NULL),
(58,2,'expirado',89.00,'2026-06-28 18:35:26','pix',NULL,NULL,NULL),
(59,2,'expirado',89.00,'2026-06-28 18:40:06','pix',NULL,NULL,NULL),
(60,2,'expirado',89.00,'2026-06-28 18:51:16','pix',NULL,NULL,NULL),
(61,2,'expirado',89.00,'2026-06-28 19:03:16','pix',NULL,NULL,NULL),
(62,2,'expirado',89.00,'2026-06-28 19:19:52','pix',NULL,NULL,NULL),
(63,2,'expirado',40.00,'2026-06-28 22:21:50','pix',NULL,'2026-06-28 19:31:50','dayaneferreiral1905@gmail.com'),
(64,2,'pago',40.00,'2026-06-28 22:53:48','pix',NULL,'2026-06-28 20:03:48',NULL),
(65,2,'expirado',40.00,'2026-06-28 23:22:08','whatsapp',NULL,'2026-06-28 20:32:08',NULL),
(66,1,'pago',40.00,'2026-06-28 23:37:01','pix',NULL,'2026-06-28 20:47:01',NULL),
(67,2,'pago',40.00,'2026-06-28 23:50:09','pix',NULL,'2026-06-28 21:00:09',NULL),
(68,2,'expirado',40.00,'2026-06-29 00:08:18','pix',NULL,'2026-06-28 21:18:18',NULL),
(69,2,'pago',40.00,'2026-06-29 00:09:06','pix',NULL,'2026-06-28 21:19:06',NULL),
(70,2,'pago',70.00,'2026-06-29 00:19:35','pix',NULL,'2026-06-28 21:29:35',NULL),
(71,2,'expirado',89.00,'2026-06-29 00:26:14','pix',NULL,'2026-06-28 21:36:14',NULL),
(72,2,'pago',89.00,'2026-06-29 00:36:54','pix',NULL,'2026-06-28 21:46:54',NULL),
(73,2,'pago',89.00,'2026-06-29 00:45:09','pix',NULL,'2026-06-28 21:55:09',NULL),
(74,2,'expirado',89.00,'2026-06-29 01:34:50','pix',NULL,'2026-06-28 22:44:50',NULL),
(75,2,'pago',89.00,'2026-06-29 01:35:16','pix',NULL,'2026-06-28 22:45:16',NULL),
(76,2,'pago',89.00,'2026-06-29 01:36:43','pix',NULL,'2026-06-28 22:46:43',NULL),
(77,2,'pago',80.00,'2026-06-29 01:39:26','pix',NULL,'2026-06-28 22:49:26',NULL),
(78,2,'pago',199.50,'2026-06-29 01:46:01','pix',NULL,'2026-06-28 22:56:01',NULL),
(79,2,'pago',89.00,'2026-06-29 01:48:38','pix',NULL,'2026-06-28 22:58:38',NULL),
(80,1,'pago',39.90,'2026-06-29 02:00:06','pix',NULL,'2026-06-28 23:10:06',NULL),
(81,1,'pago',39.90,'2026-06-29 02:02:52','pix',NULL,'2026-06-28 23:12:52',NULL),
(82,1,'expirado',39.90,'2026-06-29 02:04:37','whatsapp',NULL,'2026-06-28 23:14:37',NULL),
(83,1,'',39.90,'2026-06-29 02:07:35','pix',NULL,'2026-06-28 23:17:35',NULL),
(84,1,'expirado',39.90,'2026-06-29 02:09:14','pix',NULL,'2026-06-28 23:19:14',NULL),
(85,1,'pago',89.00,'2026-06-29 02:10:38','pix',NULL,'2026-06-28 23:20:38',NULL),
(86,1,'expirado',89.00,'2026-06-29 02:11:29','whatsapp',NULL,'2026-06-28 23:21:29',NULL),
(87,1,'expirado',39.90,'2026-06-29 02:17:20','whatsapp',NULL,'2026-06-28 23:27:20',NULL),
(88,1,'expirado',39.90,'2026-06-29 02:20:18','whatsapp',NULL,'2026-06-28 23:30:18',NULL),
(89,1,'pago',39.90,'2026-06-29 02:25:26','whatsapp',NULL,'2026-06-28 23:35:26',NULL),
(90,1,'expirado',39.90,'2026-06-29 03:08:43','pix',NULL,'2026-06-29 00:18:43',NULL),
(91,1,'pago',39.90,'2026-06-29 03:08:59','whatsapp',NULL,'2026-06-29 00:18:59',NULL),
(92,2,'expirado',39.90,'2026-06-29 03:30:18','pix',NULL,'2026-06-29 00:40:18',NULL),
(93,1,'expirado',89.00,'2026-06-29 04:05:48','pix',NULL,'2026-06-29 01:15:48',NULL),
(94,1,'expirado',39.90,'2026-06-29 04:08:44','pix',NULL,'2026-06-29 01:18:44',NULL),
(95,1,'expirado',80.00,'2026-06-29 05:24:22','pix',NULL,'2026-06-29 02:34:22',NULL),
(96,2,'expirado',40.00,'2026-07-01 19:05:21','pix',NULL,'2026-07-01 16:15:21',NULL),
(97,1,'expirado',89.00,'2026-07-02 00:39:51','pix',NULL,'2026-07-01 21:49:51',NULL),
(98,1,'pago',89.00,'2026-07-02 00:56:59','pix',NULL,'2026-07-01 22:06:59',NULL),
(99,1,'expirado',89.00,'2026-07-02 00:58:01','pix',NULL,'2026-07-01 22:08:01',NULL),
(100,1,'expirado',89.00,'2026-07-02 01:19:10','pix',NULL,'2026-07-01 22:29:10',NULL),
(101,1,'expirado',89.00,'2026-07-02 01:30:52','pix',NULL,'2026-07-01 22:40:52',NULL),
(102,1,'enviado',89.00,'2026-07-02 01:39:46','pix',NULL,'2026-07-01 22:49:46',NULL),
(103,2,'pago',89.00,'2026-07-02 01:45:55','pix',NULL,'2026-07-01 22:55:55',NULL),
(104,2,'expirado',89.00,'2026-07-02 01:49:27','pix',NULL,'2026-07-01 22:59:27',NULL),
(105,2,'expirado',89.00,'2026-07-02 02:13:17','pix',NULL,'2026-07-01 23:23:17',NULL),
(106,2,'expirado',260.00,'2026-07-03 22:09:31','pix',NULL,'2026-07-03 19:19:31',NULL),
(107,2,'pago',39.90,'2026-07-03 22:48:05','pix',NULL,'2026-07-03 19:58:05',NULL),
(108,2,'expirado',39.90,'2026-07-03 23:40:15','pix',NULL,'2026-07-03 20:50:15',NULL),
(109,2,'enviado',89.00,'2026-07-03 23:41:33','pix',NULL,'2026-07-03 20:51:33',NULL),
(110,2,'expirado',80.00,'2026-07-04 01:04:48','pix',NULL,'2026-07-03 22:14:48',NULL),
(111,2,'expirado',39.90,'2026-07-04 01:05:45','pix',NULL,'2026-07-03 22:15:45',NULL),
(112,2,'expirado',80.00,'2026-07-04 01:19:18','pix',NULL,'2026-07-03 22:29:18',NULL),
(113,2,'expirado',39.90,'2026-07-04 01:33:18','pix',NULL,'2026-07-03 22:43:18',NULL),
(114,2,'expirado',80.00,'2026-07-04 01:50:57','pix',NULL,'2026-07-03 23:00:57',NULL),
(115,2,'expirado',89.00,'2026-07-04 02:19:59','pix',NULL,'2026-07-03 23:29:59',NULL),
(116,2,'expirado',89.00,'2026-07-04 02:37:05','pix',NULL,'2026-07-03 23:47:05',NULL),
(117,2,'expirado',80.00,'2026-07-04 02:42:27','pix',NULL,'2026-07-03 23:52:27',NULL),
(118,2,'expirado',89.00,'2026-07-04 02:46:52','pix',NULL,'2026-07-03 23:56:52',NULL),
(119,2,'expirado',39.90,'2026-07-05 18:43:10','pix',NULL,'2026-07-05 15:53:10',NULL),
(120,2,'expirado',90.00,'2026-07-05 18:44:58','pix',NULL,'2026-07-05 15:54:58',NULL),
(121,2,'expirado',89.00,'2026-07-05 18:49:44','pix',NULL,'2026-07-05 15:59:44',NULL),
(122,2,'expirado',39.90,'2026-07-05 18:58:23','pix',NULL,'2026-07-05 16:08:23',NULL),
(123,2,'expirado',39.90,'2026-07-05 19:41:56','pix',NULL,'2026-07-05 16:51:56',NULL),
(124,1,'expirado',79.80,'2026-07-06 00:38:32','pix',NULL,'2026-07-05 21:48:32',NULL),
(125,2,'expirado',39.90,'2026-07-06 00:39:00','pix',NULL,'2026-07-05 21:49:00',NULL),
(126,2,'expirado',39.90,'2026-07-06 23:26:33','pix',NULL,'2026-07-06 20:36:33',NULL),
(127,2,'expirado',89.00,'2026-07-06 23:47:41','pix',NULL,'2026-07-06 20:57:41',NULL),
(128,2,'expirado',89.00,'2026-07-06 23:57:34','pix',NULL,'2026-07-06 21:07:34',NULL),
(129,2,'expirado',89.00,'2026-07-06 23:58:15','whatsapp',NULL,'2026-07-06 21:08:15',NULL),
(130,2,'expirado',89.00,'2026-07-06 23:59:14','pix',NULL,'2026-07-06 21:09:14',NULL),
(131,2,'expirado',89.00,'2026-07-07 00:10:47','pix',NULL,'2026-07-06 21:20:47',NULL),
(132,1,'expirado',89.00,'2026-07-07 00:20:29','pix',NULL,'2026-07-06 21:30:29',NULL),
(133,2,'expirado',89.00,'2026-07-07 00:25:04','pix',NULL,'2026-07-06 21:35:04',NULL),
(134,2,'enviado',89.00,'2026-07-07 00:38:14','pix',NULL,'2026-07-06 21:48:14',NULL),
(135,2,'expirado',89.00,'2026-07-07 01:04:43','pix',NULL,'2026-07-06 22:14:43',NULL),
(136,2,'expirado',89.00,'2026-07-07 01:23:33','pix',NULL,'2026-07-06 22:33:33',NULL),
(137,2,'expirado',89.00,'2026-07-07 01:34:09','pix',NULL,'2026-07-06 22:44:09',NULL),
(138,2,'expirado',89.00,'2026-07-07 01:45:04','whatsapp',NULL,'2026-07-06 22:55:04',NULL),
(139,2,'expirado',89.00,'2026-07-07 01:55:07','pix',NULL,'2026-07-06 23:05:07',NULL),
(140,2,'expirado',89.00,'2026-07-07 01:59:00','whatsapp',NULL,'2026-07-06 23:09:00',NULL),
(141,2,'expirado',89.00,'2026-07-07 02:09:54','pix',NULL,'2026-07-06 23:19:54',NULL),
(142,2,'expirado',89.00,'2026-07-07 02:18:25','whatsapp',NULL,'2026-07-06 23:28:25',NULL),
(143,2,'expirado',89.00,'2026-07-07 02:22:18','whatsapp',NULL,'2026-07-06 23:32:18',NULL),
(144,2,'expirado',89.00,'2026-07-07 02:23:45','whatsapp',NULL,'2026-07-06 23:33:45',NULL),
(145,2,'expirado',89.00,'2026-07-07 02:25:17','whatsapp',NULL,'2026-07-06 23:35:17',NULL),
(146,2,'expirado',89.00,'2026-07-07 02:27:02','whatsapp',NULL,'2026-07-06 23:37:02',NULL),
(147,1,'pago',39.90,'2026-07-07 18:43:05','pix',NULL,'2026-07-07 15:53:05',NULL),
(148,2,'expirado',80.00,'2026-07-07 19:33:40','pix',NULL,'2026-07-07 16:43:40',NULL),
(149,2,'expirado',89.00,'2026-07-07 19:50:24','pix',NULL,'2026-07-07 17:00:24',NULL),
(150,2,'enviado',89.00,'2026-07-07 21:05:03','pix',NULL,'2026-07-07 18:15:03',NULL),
(152,2,'expirado',89.00,'2026-07-07 21:19:36','pix',NULL,'2026-07-07 18:29:36',NULL),
(153,1,'expirado',89.00,'2026-07-07 22:01:48','whatsapp',NULL,'2026-07-07 19:11:48',NULL),
(154,2,'enviado',89.00,'2026-07-07 22:04:19','pix',NULL,'2026-07-07 19:14:19',NULL),
(155,1,'expirado',89.00,'2026-07-07 22:12:03','pix',NULL,'2026-07-07 19:22:03',NULL),
(156,2,'enviado',89.00,'2026-07-08 23:07:55','pix',NULL,'2026-07-08 20:17:55',NULL),
(157,2,'expirado',89.00,'2026-07-08 23:10:47','pix',NULL,'2026-07-08 20:20:47',NULL),
(158,2,'enviado',89.00,'2026-07-09 18:13:52','pix',NULL,'2026-07-09 15:23:52',NULL),
(159,1,'expirado',160.00,'2026-07-09 18:30:00','pix',NULL,'2026-07-09 15:40:00',NULL),
(160,2,'expirado',89.00,'2026-07-10 00:57:51','pix',NULL,'2026-07-09 22:07:51',NULL),
(161,2,'expirado',39.90,'2026-07-10 01:22:13','pix',NULL,'2026-07-09 22:32:13',NULL),
(162,2,'expirado',89.00,'2026-07-10 01:30:00','whatsapp',NULL,'2026-07-09 22:40:00',NULL),
(163,1,'expirado',89.00,'2026-07-10 01:42:55','pix',NULL,'2026-07-09 22:52:55',NULL),
(164,2,'expirado',89.00,'2026-07-15 17:11:12','pix',NULL,'2026-07-15 14:21:12',NULL),
(165,2,'expirado',89.00,'2026-07-15 17:24:48','pix',NULL,'2026-07-15 14:34:48',NULL),
(166,2,'expirado',160.00,'2026-07-15 17:26:22','pix',NULL,'2026-07-15 14:36:22',NULL),
(167,2,'expirado',80.00,'2026-07-15 17:28:18','pix',NULL,'2026-07-15 14:38:18',NULL),
(168,2,'expirado',160.00,'2026-07-15 17:30:10','pix',NULL,'2026-07-15 14:40:10',NULL),
(169,2,'enviado',400.00,'2026-07-15 17:31:11','pix',NULL,'2026-07-15 14:41:11',NULL),
(170,2,'expirado',178.00,'2026-07-15 17:50:11','pix',NULL,'2026-07-15 15:00:11',NULL),
(171,2,'pago',89.00,'2026-07-15 19:10:50','pix',NULL,'2026-07-15 16:20:50',NULL),
(172,2,'expirado',39.90,'2026-07-15 20:06:22','pix',NULL,'2026-07-15 17:16:22',NULL),
(173,2,'expirado',120.00,'2026-07-15 22:14:47','pix',NULL,'2026-07-15 19:24:47',NULL),
(174,2,'pago',120.00,'2026-07-15 22:26:50','pix',NULL,'2026-07-15 19:36:50',NULL),
(175,2,'expirado',60.00,'2026-07-15 22:29:19','whatsapp',NULL,'2026-07-15 19:39:19',NULL),
(176,2,'expirado',60.00,'2026-07-15 22:30:23','pix',NULL,'2026-07-15 19:40:23',NULL),
(177,2,'expirado',60.00,'2026-07-15 22:44:12','pix',NULL,'2026-07-15 19:54:12',NULL),
(178,2,'expirado',60.00,'2026-07-15 22:55:05','pix',NULL,'2026-07-15 20:05:05',NULL),
(179,2,'pago',60.00,'2026-07-16 00:26:58','pix',NULL,'2026-07-15 21:36:58',NULL),
(180,2,'expirado',90.00,'2026-07-16 01:07:07','pix',NULL,'2026-07-15 22:17:07',NULL),
(181,2,'entregue',90.00,'2026-07-16 01:35:07','pix',NULL,'2026-07-15 22:45:07',NULL),
(182,2,'pago',40.00,'2026-07-16 02:09:04','pix',NULL,'2026-07-15 23:19:04',NULL),
(183,2,'pago',89.00,'2026-07-16 02:20:50','pix',NULL,'2026-07-15 23:30:50',NULL);
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produto_imagens`
--

DROP TABLE IF EXISTS `produto_imagens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `produto_imagens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `produto_id` int(11) NOT NULL,
  `url` text NOT NULL,
  `ordem` int(11) DEFAULT 0,
  `is_principal` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_produto_imagens_produto_principal` (`produto_id`,`is_principal`),
  CONSTRAINT `produto_imagens_ibfk_1` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produto_imagens`
--

LOCK TABLES `produto_imagens` WRITE;
/*!40000 ALTER TABLE `produto_imagens` DISABLE KEYS */;
INSERT INTO `produto_imagens` VALUES
(1,1,'/uploads/produtos/1781141067333.webp',0,1),
(2,2,'/uploads/produtos/1781556510410.webp',0,1),
(3,2,'/uploads/produtos/1781556510411.webp',0,0),
(4,2,'/uploads/produtos/1781556510416.webp',0,0),
(5,3,'/uploads/produtos/1781635261270.webp',0,1),
(6,3,'/uploads/produtos/1781635261273.webp',0,0),
(7,3,'/uploads/produtos/1781635261273.webp',0,0),
(8,4,'/uploads/produtos/1781636170419.webp',0,1),
(9,4,'/uploads/produtos/1781636170419.webp',0,0),
(10,4,'/uploads/produtos/1781636170420.webp',0,0),
(14,5,'/uploads/produtos/1781731223739.webp',0,1),
(15,5,'/uploads/produtos/1781731223741.webp',0,0),
(16,5,'/uploads/produtos/1781731223742.webp',0,0),
(17,6,'/uploads/produtos/1782432860076.webp',0,1),
(18,6,'/uploads/produtos/1782432860078.webp',0,0),
(19,6,'/uploads/produtos/1782432860079.webp',0,0),
(20,7,'/uploads/produtos/1782434537574.jpg',0,1),
(21,7,'/uploads/produtos/1782434537587.jpg',0,0),
(22,8,'/uploads/produtos/1782434760118.jpg',0,1),
(23,8,'/uploads/produtos/1782434760127.jpg',0,0),
(24,9,'/uploads/produtos/1782436814306.jpg',0,1),
(25,9,'/uploads/produtos/1782436814311.jpg',0,0),
(26,9,'/uploads/produtos/1782436814312.jpg',0,0),
(27,10,'/uploads/produtos/1782708992965.jpg',0,1),
(28,10,'/uploads/produtos/1782708993064.jpg',0,0),
(29,10,'/uploads/produtos/1782708993074.jpg',0,0),
(30,11,'/uploads/produtos/1782709380941.jpg',0,1),
(31,11,'/uploads/produtos/1782709380949.jpg',0,0),
(32,11,'/uploads/produtos/1782709380969.jpg',0,0),
(33,12,'/uploads/produtos/1782934536526.jpg',0,1),
(34,12,'/uploads/produtos/1782934536546.jpg',0,0),
(35,12,'/uploads/produtos/1782934536576.jpg',0,0),
(36,13,'/uploads/produtos/ec602a40-8876-4e10-95a0-0eb67fc509a0.jpg',0,1),
(37,13,'/uploads/produtos/0a0faa4d-8cfd-4928-b37f-e2de09543c30.jpg',0,0),
(38,13,'/uploads/produtos/f0a224a6-97ec-4f7b-8c4a-fc30a0971c08.jpg',0,0);
/*!40000 ALTER TABLE `produto_imagens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produto_imagens_backup`
--

DROP TABLE IF EXISTS `produto_imagens_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `produto_imagens_backup` (
  `id` int(11) NOT NULL DEFAULT 0,
  `produto_id` int(11) NOT NULL,
  `url` text NOT NULL,
  `ordem` int(11) DEFAULT 0,
  `is_principal` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produto_imagens_backup`
--

LOCK TABLES `produto_imagens_backup` WRITE;
/*!40000 ALTER TABLE `produto_imagens_backup` DISABLE KEYS */;
INSERT INTO `produto_imagens_backup` VALUES
(1,1,'/uploads/produtos/uploads/1781141067333.webp',0,1),
(2,2,'/uploads/produtos/uploads/1781556510410.webp',0,1),
(3,2,'/uploads/produtos/uploads/1781556510411.webp',0,0),
(4,2,'/uploads/produtos/uploads/1781556510416.webp',0,0),
(5,3,'/uploads/produtos/uploads/1781635261270.webp',0,1),
(6,3,'/uploads/produtos/uploads/1781635261273.webp',0,0),
(7,3,'/uploads/produtos/uploads/1781635261273.webp',0,0),
(8,4,'/uploads/produtos/uploads/1781636170419.webp',0,1),
(9,4,'/uploads/produtos/uploads/1781636170419.webp',0,0),
(10,4,'/uploads/produtos/uploads/1781636170420.webp',0,0),
(14,5,'/uploads/produtos/uploads/1781731223739.webp',0,1),
(15,5,'/uploads/produtos/uploads/1781731223741.webp',0,0),
(16,5,'/uploads/produtos/uploads/1781731223742.webp',0,0),
(17,6,'/uploads/produtos/uploads/1782432860076.webp',0,1),
(18,6,'/uploads/produtos/uploads/1782432860078.webp',0,0),
(19,6,'/uploads/produtos/uploads/1782432860079.webp',0,0),
(20,7,'/uploads/produtos/uploads/1782434537574.jpg',0,1),
(21,7,'/uploads/produtos/uploads/1782434537587.jpg',0,0),
(22,8,'/uploads/produtos/uploads/1782434760118.jpg',0,1),
(23,8,'/uploads/produtos/uploads/1782434760127.jpg',0,0),
(24,9,'/uploads/produtos/uploads/1782436814306.jpg',0,1),
(25,9,'/uploads/produtos/uploads/1782436814311.jpg',0,0),
(26,9,'/uploads/produtos/uploads/1782436814312.jpg',0,0),
(27,10,'/uploads/produtos/uploads/1782708992965.jpg',0,1),
(28,10,'/uploads/produtos/uploads/1782708993064.jpg',0,0),
(29,10,'/uploads/produtos/uploads/1782708993074.jpg',0,0),
(30,11,'/uploads/produtos/uploads/1782709380941.jpg',0,1),
(31,11,'/uploads/produtos/uploads/1782709380949.jpg',0,0),
(32,11,'/uploads/produtos/uploads/1782709380969.jpg',0,0),
(33,12,'/uploads/produtos/uploads/1782934536526.jpg',0,1),
(34,12,'/uploads/produtos/uploads/1782934536546.jpg',0,0),
(35,12,'/uploads/produtos/uploads/1782934536576.jpg',0,0),
(36,13,'/uploads/produtos/ec602a40-8876-4e10-95a0-0eb67fc509a0.jpg',0,1),
(37,13,'/uploads/produtos/0a0faa4d-8cfd-4928-b37f-e2de09543c30.jpg',0,0),
(38,13,'/uploads/produtos/f0a224a6-97ec-4f7b-8c4a-fc30a0971c08.jpg',0,0);
/*!40000 ALTER TABLE `produto_imagens_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produto_variacoes`
--

DROP TABLE IF EXISTS `produto_variacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `produto_variacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `produto_id` int(11) NOT NULL,
  `cor` varchar(50) DEFAULT NULL,
  `tamanho` varchar(50) DEFAULT NULL,
  `preco` decimal(10,2) NOT NULL,
  `estoque` int(11) NOT NULL DEFAULT 0,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `sku` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_produto_variacoes_produto_id` (`produto_id`),
  KEY `idx_produto_variacoes_produto_ativo` (`produto_id`,`ativo`),
  CONSTRAINT `produto_variacoes_ibfk_1` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_estoque_nonnegative` CHECK (`estoque` >= 0),
  CONSTRAINT `chk_preco_variacao_nonnegative` CHECK (`preco` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produto_variacoes`
--

LOCK TABLES `produto_variacoes` WRITE;
/*!40000 ALTER TABLE `produto_variacoes` DISABLE KEYS */;
INSERT INTO `produto_variacoes` VALUES
(1,1,'preta','m',89.90,13,1,NULL),
(8,4,'Preta','P',39.90,15,1,NULL),
(9,4,'Preta','M',39.90,15,1,NULL),
(10,4,'Preta','G',39.90,15,1,NULL),
(11,4,'Branca','P',39.90,15,1,NULL),
(12,4,'Branca','M',39.90,15,1,NULL),
(13,4,'Branca','G',39.90,15,1,NULL),
(17,3,'PRETA ','P ',39.90,3,1,NULL),
(18,3,'BRANCA','M',39.90,20,1,NULL),
(20,5,'Branca','M',39.90,5,1,NULL),
(21,5,'Preta','G',39.90,5,1,NULL),
(22,5,'Azul','P',39.90,5,1,NULL),
(23,2,'jeans','P',89.00,9,1,NULL),
(25,6,'Preto','Único',40.00,3,1,NULL),
(28,8,'Preto','Único',40.00,0,1,NULL),
(29,8,'Branco','Único',40.00,1,1,NULL),
(34,9,'Branco','Veste P/M',70.00,0,1,NULL),
(35,9,'Preto','Veste P/M',70.00,2,1,NULL),
(36,9,'Vinho','Veste P/M',70.00,1,1,NULL),
(37,9,'Marron','Veste P/M',70.00,2,1,NULL),
(38,7,'Branco','Único',40.00,1,1,NULL),
(39,7,'Preto','Único',40.00,1,1,NULL),
(40,10,'Preto','Disponível 44',80.00,5,1,NULL),
(41,10,' jeans','Disponível 44',80.00,0,1,NULL),
(42,11,'Preto','44',0.00,5,1,NULL),
(43,11,' jeans','44',0.00,5,1,NULL),
(44,12,' jeans','G',90.00,3,1,NULL),
(45,13,'jeans','36',60.00,0,1,NULL),
(46,13,'jeans','40',60.00,1,1,NULL),
(47,13,'jeans','42',60.00,2,1,NULL);
/*!40000 ALTER TABLE `produto_variacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produtos`
--

DROP TABLE IF EXISTS `produtos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `produtos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `preco_base` decimal(10,2) NOT NULL,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `categoria_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_produtos_categoria_ativo` (`categoria_id`,`ativo`),
  CONSTRAINT `produtos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  CONSTRAINT `chk_preco_base_nonnegative` CHECK (`preco_base` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produtos`
--

LOCK TABLES `produtos` WRITE;
/*!40000 ALTER TABLE `produtos` DISABLE KEYS */;
INSERT INTO `produtos` VALUES
(1,'calça ','calça jeans',79.90,0,'2026-06-11 01:24:27',9),
(2,'Calça jeans','Calça jeans',79.00,1,'2026-06-15 20:48:30',9),
(3,'Blusa','Blusa ',39.90,1,'2026-06-16 18:41:01',1),
(4,'Blusa','Blusa',35.99,0,'2026-06-16 18:56:10',1),
(5,'Blusa','Blusa',39.90,1,'2026-06-16 19:03:39',1),
(6,'Blusa tule','Blusa tule',40.00,1,'2026-06-26 00:14:20',1),
(7,'Cropped over bulls','Cropped over bulls',40.00,1,'2026-06-26 00:42:17',1),
(8,'Cropped Lakers','Cropped Lakers',40.00,1,'2026-06-26 00:46:00',1),
(9,'Bory argola','Não contém bojo,  Veste P|M.',70.00,0,'2026-06-26 01:20:14',2),
(10,'Short good vibes','Não contém lycra',80.00,1,'2026-06-29 04:56:33',3),
(11,'Short good vibes','Não contém lycra',0.00,0,'2026-06-29 05:03:01',3),
(12,'Macaquinho jeans','Com lycra',90.00,1,'2026-07-01 19:35:36',6),
(13,'Short saia completo','Forma grande  Sem lycra',60.00,1,'2026-07-09 18:25:06',5);
/*!40000 ALTER TABLE `produtos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `senha` varchar(255) DEFAULT NULL,
  `tipo` enum('cliente','admin') DEFAULT 'cliente',
  `ativo` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `codigo_confirmacao` varchar(10) DEFAULT NULL,
  `token_confirmacao` varchar(255) DEFAULT NULL,
  `celular` varchar(20) DEFAULT NULL,
  `rua` varchar(150) DEFAULT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `token_redefinicao` varchar(64) DEFAULT NULL,
  `token_redefinicao_expira_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_usuarios_token_redefinicao` (`token_redefinicao`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES
(1,'cleyton silva','cleytonds.cs@gmail.com','$2b$10$SfO9fx5wHmpILdu9eiRHc.V5mQEaeW8sUbjE5fi4.56neK9oXvrTa','admin',1,'2026-04-20 02:05:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'f4490cb3983fbbd6e6701f331f213b3ff4978b9c71eadf1d454dc7941500bcfe','2026-07-15 21:14:19'),
(2,'dayane ferreira','dayaneferreiral1905@gmail.com','$2b$10$TN7P8b4EqE6vHrN/ZjjSOudqK09tBYFzp/HFWikwbkTg3oVKdSEcS','cliente',1,'2026-04-20 20:44:53',NULL,NULL,'','','','','','','',NULL,NULL,NULL),
(3,'heitor','sepotel940@besteya.com','$2b$10$fT6mUXV4JgolZQcEea9HH.mUutg89EXiSpWGVpZFeze8sIyFp3kj6','cliente',1,'2026-07-15 23:01:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'loja_online'
--

--
-- Dumping routines for database 'loja_online'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-07-16 19:14:55
