<?php
require '../database/database.php';
require('../libraries/fpdf/fpdf.php');

function convertToISO($text) {
    return iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $text);
}

class PDF extends FPDF
{
    function Header()
    {
        // Cadres bleu double
        $this->SetDrawColor(74, 144, 226);
        $this->SetLineWidth(3);
        $this->Rect(10, 10, 277, 190, 'D');
        $this->SetLineWidth(0.8);
        $this->Rect(12, 12, 273, 186, 'D');

        // Logos
        $this->Image('../assets/img/logo.png', 15, 20, 30);
        $this->Image('../assets/img/logo.png', 252, 20, 30);

        // Titre principal
        $this->SetFont('Times', 'B', 40);
        $this->SetTextColor(44, 62, 80);
        $this->SetXY(10, 28);
        $this->Cell(277, 12, convertToISO('Certificat de Formation'), 0, 1, 'C');
    }

    function Content()
    {
        $this->SetY(60);

        // Sous-titre
        $this->SetFont('Times', '', 14);
        $this->Cell(0, 8, convertToISO('Ce certificat est décerné à'), 0, 1, 'C');

        // Nom
        $this->SetFont('Times', 'B', 28);
        $this->Ln(4);
        $this->Cell(0, 10, convertToISO('Alexandre Dupuis'), 0, 1, 'C');

        // Détails
        $this->SetFont('Times', '', 14);
        $this->Ln(6);
        $this->MultiCell(0, 6, convertToISO(
            "Pour avoir complété avec succès la formation :\n" .
            "\"Développement Web Moderne avec React et Node.js\"\n" .
            "Durée totale : 40 heures\n" .
            "Du 1er avril 2025 au 28 avril 2025"
        ), 0, 'C');

        // Footer
        $this->Ln(12);
        $this->MultiCell(0, 6, convertToISO(
            "Certificat délivré le 30 mai 2025\n" .
            "Organisme de formation : Académie Numérique Pro\n" .
            "Responsable pédagogique : Claire Lemoine"
        ), 0, 'C');

        // Signatures
        $this->Ln(16);
        $y = $this->GetY();
        $this->SetDrawColor(153, 153, 153);
        $this->Line(60, $y, 130, $y);
        $this->Line(170, $y, 240, $y);

        $this->SetY($y + 2);
        $this->SetX(60);
        $this->SetFont('Times', '', 11);
        $this->MultiCell(70, 5, convertToISO("Claire Lemoine\nResponsable pédagogique"), 0, 'C');

        $this->SetY($y + 2);
        $this->SetX(170);
        $this->MultiCell(70, 5, convertToISO("Académie Numérique Pro"), 0, 'C');
    }
}

$pdf = new PDF('L', 'mm', 'A4'); // Paysage
$pdf->AddPage();
$pdf->Content();
$pdf->Output('I', 'certificat_formation.pdf');
?>
