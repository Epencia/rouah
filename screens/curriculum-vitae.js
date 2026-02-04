import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  Platform,
  Switch,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

const CurriculumVitae = () => {
  const cvRef = useRef();
  const [activeTab, setActiveTab] = useState('preview'); // Changé pour afficher l'aperçu par défaut
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState('');

  // Informations personnelles
  const [personalInfo, setPersonalInfo] = useState({
    firstName: 'Jean',
    lastName: 'DUPONT',
    title: 'Développeur Full Stack Senior',
    email: 'jean.dupont@email.com',
    phone: '+33 6 12 34 56 78',
    address: '123 Avenue des Champs, 75008 Paris',
    linkedin: 'linkedin.com/in/jeandupont',
    github: 'github.com/jdupont',
    website: 'jeandupont.dev',
    summary: 'Développeur Full Stack avec 8 ans d\'expérience dans la création d\'applications web et mobiles. Passionné par les technologies modernes et les bonnes pratiques de développement. Expert React, Node.js et architectures cloud.',
  });

  // Expériences professionnelles
  const [experiences, setExperiences] = useState([
    {
      id: '1',
      title: 'Lead Developer',
      company: 'Tech Innovations SA',
      location: 'Paris',
      startDate: '2020-03-01',
      endDate: '2023-12-01',
      current: true,
      description: 'Direction d\'une équipe de 5 développeurs. Développement d\'applications React Native et Node.js. Mise en place de CI/CD. Architecture microservices sur AWS.',
      achievements: [
        'Augmentation de 40% des performances',
        'Réduction de 60% des coûts infrastructure',
        'Formation de 3 juniors'
      ]
    },
    {
      id: '2',
      title: 'Développeur Full Stack',
      company: 'Startup XYZ',
      location: 'Lyon',
      startDate: '2018-06-01',
      endDate: '2020-02-28',
      current: false,
      description: 'Développement d\'une plateforme SaaS. Frontend React, backend Node.js avec Express. Base de données MongoDB.',
      achievements: [
        'Livraison du MVP en 3 mois',
        'Scalabilité à 10k utilisateurs'
      ]
    }
  ]);

  // Formations
  const [education, setEducation] = useState([
    {
      id: '1',
      degree: 'Master en Informatique',
      school: 'École Polytechnique',
      location: 'Palaiseau',
      startDate: '2014-09-01',
      endDate: '2016-06-30',
      description: 'Spécialisation en intelligence artificielle et développement logiciel.'
    },
    {
      id: '2',
      degree: 'Licence Informatique',
      school: 'Université Paris-Saclay',
      location: 'Orsay',
      startDate: '2011-09-01',
      endDate: '2014-06-30',
      description: 'Mention Bien. Projet de fin d\'études sur l\'optimisation d\'algorithmes.'
    }
  ]);

  // Compétences
  const [skills, setSkills] = useState({
    technical: [
      { name: 'React / React Native', level: 95 },
      { name: 'Node.js / Express', level: 90 },
      { name: 'TypeScript', level: 85 },
      { name: 'AWS / Docker', level: 80 },
      { name: 'MongoDB / PostgreSQL', level: 85 },
      { name: 'Git / CI/CD', level: 90 }
    ],
    soft: [
      'Leadership',
      'Communication',
      'Résolution de problèmes',
      'Gestion de projet',
      'Travail d\'équipe',
      'Créativité'
    ],
    languages: [
      { name: 'Français', level: 'Langue maternelle' },
      { name: 'Anglais', level: 'Courant (TOEIC 950)' },
      { name: 'Espagnol', level: 'Intermédiaire' }
    ]
  });

  // Projets
  const [projects, setProjects] = useState([
    {
      id: '1',
      name: 'Application de Gestion Financière',
      description: 'Application mobile React Native pour la gestion des finances personnelles.',
      technologies: ['React Native', 'Node.js', 'MongoDB', 'AWS'],
      link: 'github.com/jdupont/finance-app'
    },
    {
      id: '2',
      name: 'Plateforme E-learning',
      description: 'Site web avec cours en ligne et système de suivi de progression.',
      technologies: ['React', 'Express', 'PostgreSQL', 'Docker'],
      link: 'github.com/jdupont/elearning'
    }
  ]);

  // Certifications
  const [certifications, setCertifications] = useState([
    'AWS Certified Solutions Architect',
    'React Native Certified Developer',
    'Scrum Master Professional'
  ]);

  // Design du CV
  const [cvDesign, setCvDesign] = useState({
    template: 'modern',
    colorScheme: {
      primary: '#2c3e50',
      secondary: '#3498db',
      accent: '#e74c3c',
      background: '#ffffff',
      text: '#333333'
    },
    fontFamily: 'Arial',
    fontSize: 'normal',
    layout: 'traditional',
    showPhoto: false,
    photoUrl: null,
    showSkillsChart: true,
    showSummary: true,
    showProjects: true,
    showCertifications: true,
    pageMargins: 20,
    lineSpacing: 1.5
  });

  // Templates disponibles
  const templates = [
    { id: 'professional', name: 'Professionnel', colors: ['#2c3e50', '#34495e'], icon: 'briefcase' },
    { id: 'modern', name: 'Moderne', colors: ['#3498db', '#2980b9'], icon: 'desktop-mac' },
    { id: 'creative', name: 'Créatif', colors: ['#9b59b6', '#8e44ad'], icon: 'palette' },
    { id: 'minimal', name: 'Minimaliste', colors: ['#7f8c8d', '#95a5a6'], icon: 'format-clear' },
    { id: 'elegant', name: 'Élégant', colors: ['#27ae60', '#219653'], icon: 'diamond' }
  ];

  // Layouts disponibles
  const layouts = [
    { id: 'traditional', name: 'Traditionnel', icon: 'file-document', description: 'Structure classique' },
    { id: 'creative', name: 'Créatif', icon: 'view-grid-plus', description: 'Design moderne avec colonnes' },
    { id: 'minimal', name: 'Minimal', icon: 'view-headline', description: 'Simple et épuré' },
    { id: 'chronological', name: 'Chronologique', icon: 'timeline', description: 'Focus sur l\'expérience' },
    { id: 'functional', name: 'Fonctionnel', icon: 'chart-bar', description: 'Focus sur les compétences' }
  ];

  // Navigation tabs
  const tabs = [
    { id: 'preview', label: 'Aperçu', icon: 'eye' },
    { id: 'info', label: 'Infos', icon: 'account' },
    { id: 'experience', label: 'Expérience', icon: 'briefcase' },
    { id: 'skills', label: 'Compétences', icon: 'tools' },
    { id: 'design', label: 'Design', icon: 'palette' },
    { id: 'export', label: 'Exporter', icon: 'export' }
  ];

  // Ajouter une expérience
  const addExperience = () => {
    const newId = (experiences.length + 1).toString();
    setExperiences([...experiences, {
      id: newId,
      title: '',
      company: '',
      location: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      current: false,
      description: '',
      achievements: []
    }]);
  };

  // Ajouter une formation
  const addEducation = () => {
    const newId = (education.length + 1).toString();
    setEducation([...education, {
      id: newId,
      degree: '',
      school: '',
      location: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      description: ''
    }]);
  };

  // Ajouter une compétence technique
  const addTechnicalSkill = () => {
    setSkills({
      ...skills,
      technical: [...skills.technical, { name: '', level: 50 }]
    });
  };

  // Ajouter un projet
  const addProject = () => {
    const newId = (projects.length + 1).toString();
    setProjects([...projects, {
      id: newId,
      name: '',
      description: '',
      technologies: [],
      link: ''
    }]);
  };

  // Supprimer un élément
  const removeItem = (array, setter, id) => {
    if (array.length > 1) {
      setter(array.filter(item => item.id !== id));
    }
  };

  // Mettre à jour un élément
  const updateItem = (array, setter, id, field, value) => {
    setter(array.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  // Calculer la durée en années/mois
  const calculateDuration = (startDate, endDate, current) => {
    const start = new Date(startDate);
    const end = current ? new Date() : new Date(endDate);
    
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    
    const yearsDisplay = Math.floor(totalMonths / 12);
    const monthsDisplay = totalMonths % 12;
    
    if (yearsDisplay === 0) {
      return monthsDisplay === 0 ? '1 mois' : `${monthsDisplay} mois`;
    } else if (monthsDisplay === 0) {
      return `${yearsDisplay} an${yearsDisplay > 1 ? 's' : ''}`;
    } else {
      return `${yearsDisplay} an${yearsDisplay > 1 ? 's' : ''} ${monthsDisplay} mois`;
    }
  };

  // Générer le contenu HTML du CV
  const generateCVHTML = async () => {
    const margins = cvDesign.pageMargins;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>CV - ${personalInfo.firstName} ${personalInfo.lastName}</title>
        <style>
          @page {
            margin: ${margins}mm;
            size: A4;
          }
          
          body {
            font-family: ${cvDesign.fontFamily}, Arial, sans-serif;
            color: ${cvDesign.colorScheme.text};
            line-height: ${cvDesign.lineSpacing};
            margin: 0;
            padding: 0;
            font-size: ${cvDesign.fontSize === 'large' ? '12pt' : '11pt'};
          }
          
          .cv-container {
            max-width: 210mm;
            margin: 0 auto;
          }
          
          /* Header */
          .header {
            padding: 20px 0;
            ${cvDesign.layout === 'creative' ? `
              display: flex;
              justify-content: space-between;
              align-items: center;
            ` : ''}
            border-bottom: 3px solid ${cvDesign.colorScheme.primary};
            margin-bottom: 25px;
          }
          
          .name {
            font-size: 28pt;
            font-weight: bold;
            color: ${cvDesign.colorScheme.primary};
            margin: 0 0 5px 0;
          }
          
          .title {
            font-size: 14pt;
            color: ${cvDesign.colorScheme.secondary};
            margin: 0 0 15px 0;
          }
          
          .contact-info {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 10px;
            font-size: 10pt;
          }
          
          .contact-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          
          /* Sections */
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 16pt;
            font-weight: bold;
            color: ${cvDesign.colorScheme.primary};
            border-bottom: 2px solid ${cvDesign.colorScheme.secondary};
            padding-bottom: 5px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          /* Experience & Education */
          .timeline-item {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          
          .item-title {
            font-weight: bold;
            font-size: 12pt;
            color: ${cvDesign.colorScheme.text};
          }
          
          .item-subtitle {
            color: ${cvDesign.colorScheme.secondary};
            font-size: 11pt;
          }
          
          .item-date {
            color: #666;
            font-size: 10pt;
            white-space: nowrap;
          }
          
          .item-description {
            margin-top: 5px;
            font-size: 10pt;
            line-height: 1.4;
          }
          
          .achievements {
            margin-top: 8px;
            padding-left: 20px;
          }
          
          .achievement {
            margin-bottom: 3px;
            font-size: 10pt;
          }
          
          /* Skills */
          .skills-grid {
            display: grid;
            grid-template-columns: ${cvDesign.layout === 'creative' ? '1fr 1fr' : '1fr'};
            gap: 20px;
          }
          
          .skill-category {
            margin-bottom: 15px;
          }
          
          .skill-item {
            margin-bottom: 10px;
          }
          
          .skill-name {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 10pt;
          }
          
          .skill-bar {
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .skill-level {
            height: 100%;
            background: ${cvDesign.colorScheme.secondary};
            border-radius: 4px;
          }
          
          .soft-skills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 5px;
          }
          
          .soft-skill {
            background: ${cvDesign.colorScheme.primary};
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 9pt;
          }
          
          /* Projects */
          .project-item {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px dashed #eee;
          }
          
          .project-name {
            font-weight: bold;
            color: ${cvDesign.colorScheme.primary};
            margin-bottom: 5px;
          }
          
          .project-tech {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
          }
          
          .tech-tag {
            background: ${cvDesign.colorScheme.accent};
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 8pt;
          }
          
          /* Layout spécifique */
          ${cvDesign.layout === 'creative' ? `
            .main-content {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 30px;
            }
            
            .left-column {
              border-right: 1px solid #eee;
              padding-right: 25px;
            }
            
            .right-column {
              padding-left: 10px;
            }
          ` : ''}
          
          ${cvDesign.layout === 'minimal' ? `
            .header {
              border-bottom: none;
              text-align: center;
            }
            
            .section-title {
              border-bottom: 1px solid #ccc;
              text-transform: none;
              letter-spacing: normal;
            }
            
            .item-header {
              flex-direction: column;
              gap: 5px;
            }
          ` : ''}
          
          /* Utilitaires */
          .page-break {
            page-break-before: always;
          }
          
          .no-print {
            display: none;
          }
          
          /* Responsive pour PDF */
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .cv-container {
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="cv-container">
          <!-- Header -->
          <div class="header">
            <div>
              <h1 class="name">${personalInfo.firstName} ${personalInfo.lastName}</h1>
              <div class="title">${personalInfo.title}</div>
              <div class="contact-info">
                ${personalInfo.email ? `
                  <div class="contact-item">
                    <span>📧</span>
                    <span>${personalInfo.email}</span>
                  </div>
                ` : ''}
                
                ${personalInfo.phone ? `
                  <div class="contact-item">
                    <span>📱</span>
                    <span>${personalInfo.phone}</span>
                  </div>
                ` : ''}
                
                ${personalInfo.address ? `
                  <div class="contact-item">
                    <span>📍</span>
                    <span>${personalInfo.address}</span>
                  </div>
                ` : ''}
                
                ${personalInfo.linkedin ? `
                  <div class="contact-item">
                    <span>💼</span>
                    <span>${personalInfo.linkedin}</span>
                  </div>
                ` : ''}
                
                ${personalInfo.github ? `
                  <div class="contact-item">
                    <span>💻</span>
                    <span>${personalInfo.github}</span>
                  </div>
                ` : ''}
                
                ${personalInfo.website ? `
                  <div class="contact-item">
                    <span>🌐</span>
                    <span>${personalInfo.website}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          
          <div class="${cvDesign.layout === 'creative' ? 'main-content' : ''}">
            <!-- Colonne gauche -->
            <div class="${cvDesign.layout === 'creative' ? 'left-column' : ''}">
              <!-- Résumé -->
              ${cvDesign.showSummary && personalInfo.summary ? `
                <div class="section">
                  <div class="section-title">Profil Professionnel</div>
                  <div class="item-description">
                    ${personalInfo.summary.replace(/\n/g, '<br>')}
                  </div>
                </div>
              ` : ''}
              
              <!-- Expérience professionnelle -->
              <div class="section">
                <div class="section-title">Expérience Professionnelle</div>
                ${experiences.map(exp => `
                  <div class="timeline-item">
                    <div class="item-header">
                      <div>
                        <div class="item-title">${exp.title}</div>
                        <div class="item-subtitle">${exp.company} • ${exp.location}</div>
                      </div>
                      <div class="item-date">
                        ${formatDate(exp.startDate)} - ${exp.current ? 'Présent' : formatDate(exp.endDate)}
                        <div style="font-size: 9pt; color: #888;">
                          ${calculateDuration(exp.startDate, exp.endDate, exp.current)}
                        </div>
                      </div>
                    </div>
                    <div class="item-description">${exp.description}</div>
                    ${exp.achievements && exp.achievements.length > 0 ? `
                      <div class="achievements">
                        ${exp.achievements.map(ach => `
                          <div class="achievement">• ${ach}</div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
              
              <!-- Formation -->
              <div class="section">
                <div class="section-title">Formation</div>
                ${education.map(edu => `
                  <div class="timeline-item">
                    <div class="item-header">
                      <div>
                        <div class="item-title">${edu.degree}</div>
                        <div class="item-subtitle">${edu.school} • ${edu.location}</div>
                      </div>
                      <div class="item-date">
                        ${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}
                      </div>
                    </div>
                    <div class="item-description">${edu.description}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Colonne droite (uniquement pour layout creative) -->
            ${cvDesign.layout === 'creative' ? `
              <div class="right-column">
                <!-- Compétences techniques -->
                <div class="section">
                  <div class="section-title">Compétences Techniques</div>
                  <div class="skills-grid">
                    ${skills.technical.map(skill => `
                      <div class="skill-item">
                        <div class="skill-name">
                          <span>${skill.name}</span>
                          <span>${skill.level}%</span>
                        </div>
                        <div class="skill-bar">
                          <div class="skill-level" style="width: ${skill.level}%"></div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                
                <!-- Compétences personnelles -->
                <div class="section">
                  <div class="section-title">Compétences Personnelles</div>
                  <div class="soft-skills">
                    ${skills.soft.map(skill => `
                      <div class="soft-skill">${skill}</div>
                    `).join('')}
                  </div>
                </div>
                
                <!-- Langues -->
                <div class="section">
                  <div class="section-title">Langues</div>
                  ${skills.languages.map(lang => `
                    <div style="margin-bottom: 8px;">
                      <div style="font-weight: bold;">${lang.name}</div>
                      <div style="font-size: 10pt; color: #666;">${lang.level}</div>
                    </div>
                  `).join('')}
                </div>
                
                <!-- Projets -->
                ${cvDesign.showProjects ? `
                  <div class="section">
                    <div class="section-title">Projets</div>
                    ${projects.map(project => `
                      <div class="project-item">
                        <div class="project-name">${project.name}</div>
                        <div class="item-description">${project.description}</div>
                        ${project.technologies && project.technologies.length > 0 ? `
                          <div class="project-tech">
                            ${project.technologies.map(tech => `
                              <div class="tech-tag">${tech}</div>
                            `).join('')}
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                
                <!-- Certifications -->
                ${cvDesign.showCertifications && certifications.length > 0 ? `
                  <div class="section">
                    <div class="section-title">Certifications</div>
                    ${certifications.map(cert => `
                      <div style="margin-bottom: 8px; font-size: 10pt;">
                        • ${cert}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            ` : `
              <!-- Pour les autres layouts, tout sur une colonne -->
              <!-- Compétences techniques -->
              <div class="section">
                <div class="section-title">Compétences</div>
                <div class="skills-grid">
                  <div>
                    <div class="skill-category">
                      <div style="font-weight: bold; margin-bottom: 10px;">Techniques</div>
                      ${skills.technical.map(skill => `
                        <div class="skill-item">
                          <div class="skill-name">
                            <span>${skill.name}</span>
                            <span>${skill.level}%</span>
                          </div>
                          <div class="skill-bar">
                            <div class="skill-level" style="width: ${skill.level}%"></div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  
                  <div>
                    <div class="skill-category">
                      <div style="font-weight: bold; margin-bottom: 10px;">Personnelles</div>
                      <div class="soft-skills">
                        ${skills.soft.map(skill => `
                          <div class="soft-skill">${skill}</div>
                        `).join('')}
                      </div>
                    </div>
                    
                    <div class="skill-category">
                      <div style="font-weight: bold; margin-bottom: 10px;">Langues</div>
                      ${skills.languages.map(lang => `
                        <div style="margin-bottom: 8px;">
                          <div>${lang.name}</div>
                          <div style="font-size: 10pt; color: #666;">${lang.level}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Projets -->
              ${cvDesign.showProjects ? `
                <div class="section">
                  <div class="section-title">Projets Réalisés</div>
                  ${projects.map(project => `
                    <div class="project-item">
                      <div class="project-name">${project.name}</div>
                      <div class="item-description">${project.description}</div>
                      ${project.technologies && project.technologies.length > 0 ? `
                        <div class="project-tech">
                          ${project.technologies.map(tech => `
                            <div class="tech-tag">${tech}</div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <!-- Certifications -->
              ${cvDesign.showCertifications && certifications.length > 0 ? `
                <div class="section">
                  <div class="section-title">Certifications</div>
                  ${certifications.map(cert => `
                    <div style="margin-bottom: 8px; font-size: 10pt;">
                      • ${cert}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            `}
          </div>
          
          <!-- Footer -->
          <div style="
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 9pt;
            color: #999;
            text-align: center;
          ">
            CV généré avec CV Generator • Mis à jour le ${new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  };

  // Générer le PDF
  const generatePDF = async () => {
    setIsLoading(true);
    try {
      const html = await generateCVHTML();
      
      const { uri } = await Print.printToFileAsync({
        html: html,
        width: 210, // A4 width in mm
        height: 297, // A4 height in mm
        margins: {
          top: cvDesign.pageMargins,
          bottom: cvDesign.pageMargins,
          left: cvDesign.pageMargins,
          right: cvDesign.pageMargins
        }
      });
      
      setIsLoading(false);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Votre CV Professionnel',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert(
          'Succès',
          'CV généré avec succès !',
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
      
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erreur', 'Impossible de générer le CV');
    }
  };

  // Exporter en Word (HTML)
  const exportWord = async () => {
    setIsLoading(true);
    try {
      const html = await generateCVHTML();
      
      const fileName = `CV_${personalInfo.firstName}_${personalInfo.lastName}_${new Date().getTime()}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, html);
      
      setIsLoading(false);
      Alert.alert(
        'Succès',
        'CV exporté au format HTML (compatible Word)',
        [
          { text: 'OK', style: 'cancel' }
        ]
      );
      
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erreur', 'Impossible d\'exporter le CV');
    }
  };

  // Aperçu complet du CV
  const renderFullPreview = () => {
    return (
      <View 
        ref={cvRef}
        style={[
          styles.cvPreview,
          {
            backgroundColor: cvDesign.colorScheme.background,
            borderColor: cvDesign.colorScheme.primary,
            padding: cvDesign.pageMargins
          }
        ]}
      >
        {/* Header */}
        <View style={[styles.headerPreview, { borderBottomColor: cvDesign.colorScheme.primary }]}>
          <Text style={[styles.namePreview, { color: cvDesign.colorScheme.primary }]}>
            {personalInfo.firstName} {personalInfo.lastName}
          </Text>
          <Text style={[styles.titlePreview, { color: cvDesign.colorScheme.secondary }]}>
            {personalInfo.title}
          </Text>
          
          <View style={styles.contactPreview}>
            {personalInfo.email && (
              <View style={styles.contactItem}>
                <Icon name="email" size={12} color={cvDesign.colorScheme.text} />
                <Text style={[styles.contactText, { color: cvDesign.colorScheme.text }]}>
                  {personalInfo.email}
                </Text>
              </View>
            )}
            
            {personalInfo.phone && (
              <View style={styles.contactItem}>
                <Icon name="phone" size={12} color={cvDesign.colorScheme.text} />
                <Text style={[styles.contactText, { color: cvDesign.colorScheme.text }]}>
                  {personalInfo.phone}
                </Text>
              </View>
            )}
            
            {personalInfo.address && (
              <View style={styles.contactItem}>
                <Icon name="map-marker" size={12} color={cvDesign.colorScheme.text} />
                <Text style={[styles.contactText, { color: cvDesign.colorScheme.text }]}>
                  {personalInfo.address}
                </Text>
              </View>
            )}
            
            {personalInfo.linkedin && (
              <View style={styles.contactItem}>
                <Icon name="linkedin" size={12} color={cvDesign.colorScheme.text} />
                <Text style={[styles.contactText, { color: cvDesign.colorScheme.text }]}>
                  {personalInfo.linkedin}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Résumé */}
        {cvDesign.showSummary && personalInfo.summary && (
          <View style={styles.sectionPreview}>
            <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
              Profil Professionnel
            </Text>
            <Text style={styles.sectionText}>
              {personalInfo.summary}
            </Text>
          </View>
        )}

        {/* Expérience */}
        <View style={styles.sectionPreview}>
          <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
            Expérience Professionnelle
          </Text>
          
          {experiences.map((exp, index) => (
            <View key={index} style={styles.experienceItem}>
              <View style={styles.experienceHeader}>
                <View>
                  <Text style={styles.experienceTitle}>{exp.title}</Text>
                  <Text style={styles.experienceCompany}>
                    {exp.company} • {exp.location}
                  </Text>
                </View>
                <Text style={styles.experienceDate}>
                  {formatDate(exp.startDate)} - {exp.current ? 'Présent' : formatDate(exp.endDate)}
                </Text>
              </View>
              <Text style={styles.experienceDescription}>{exp.description}</Text>
              {exp.achievements && exp.achievements.length > 0 && (
                <View style={styles.achievementsList}>
                  {exp.achievements.map((ach, idx) => (
                    <Text key={idx} style={styles.achievementText}>• {ach}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Formation */}
        <View style={styles.sectionPreview}>
          <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
            Formation
          </Text>
          
          {education.map((edu, index) => (
            <View key={index} style={styles.educationItem}>
              <View style={styles.educationHeader}>
                <View>
                  <Text style={styles.educationTitle}>{edu.degree}</Text>
                  <Text style={styles.educationSchool}>
                    {edu.school} • {edu.location}
                  </Text>
                </View>
                <Text style={styles.educationDate}>
                  {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                </Text>
              </View>
              <Text style={styles.educationDescription}>{edu.description}</Text>
            </View>
          ))}
        </View>

        {/* Compétences techniques */}
        <View style={styles.sectionPreview}>
          <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
            Compétences Techniques
          </Text>
          
          <View style={styles.skillsGrid}>
            {skills.technical.map((skill, index) => (
              <View key={index} style={styles.skillItem}>
                <View style={styles.skillHeader}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillPercentage}>{skill.level}%</Text>
                </View>
                <View style={styles.skillBar}>
                  <View 
                    style={[
                      styles.skillLevel,
                      { 
                        width: `${skill.level}%`,
                        backgroundColor: cvDesign.colorScheme.secondary
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Compétences personnelles */}
        <View style={styles.sectionPreview}>
          <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
            Compétences Personnelles
          </Text>
          <View style={styles.softSkills}>
            {skills.soft.map((skill, index) => (
              <View key={index} style={[styles.softSkillTag, { backgroundColor: cvDesign.colorScheme.primary }]}>
                <Text style={styles.softSkillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Langues */}
        <View style={styles.sectionPreview}>
          <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
            Langues
          </Text>
          <View style={styles.languagesList}>
            {skills.languages.map((lang, index) => (
              <View key={index} style={styles.languageItem}>
                <Text style={styles.languageName}>{lang.name}</Text>
                <Text style={styles.languageLevel}>{lang.level}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Projets */}
        {cvDesign.showProjects && projects.length > 0 && (
          <View style={styles.sectionPreview}>
            <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
              Projets
            </Text>
            {projects.map((project, index) => (
              <View key={index} style={styles.projectItem}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectDescription}>{project.description}</Text>
                <View style={styles.projectTech}>
                  {project.technologies.map((tech, idx) => (
                    <View key={idx} style={[styles.techTag, { backgroundColor: cvDesign.colorScheme.accent }]}>
                      <Text style={styles.techText}>{tech}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {cvDesign.showCertifications && certifications.length > 0 && (
          <View style={styles.sectionPreview}>
            <Text style={[styles.sectionTitle, { color: cvDesign.colorScheme.primary }]}>
              Certifications
            </Text>
            <View style={styles.certificationsList}>
              {certifications.map((cert, index) => (
                <Text key={index} style={styles.certificationText}>• {cert}</Text>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Rendu du contenu selon l'onglet sélectionné
  const renderContent = () => {
    switch (activeTab) {
      case 'preview':
        return (
          <View style={styles.previewTab}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Aperçu du CV</Text>
              <Text style={styles.previewSubtitle}>
                Format A4 • Optimisé pour les systèmes ATS
              </Text>
            </View>
            <ScrollView style={styles.previewContainer}>
              {renderFullPreview()}
              <View style={styles.previewStats}>
                <View style={styles.statRow}>
                  <View style={styles.statBox}>
                    <Icon name="briefcase" size={20} color={cvDesign.colorScheme.primary} />
                    <Text style={styles.statNumber}>{experiences.length}</Text>
                    <Text style={styles.statLabel}>Expériences</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Icon name="school" size={20} color={cvDesign.colorScheme.primary} />
                    <Text style={styles.statNumber}>{education.length}</Text>
                    <Text style={styles.statLabel}>Formations</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Icon name="tools" size={20} color={cvDesign.colorScheme.primary} />
                    <Text style={styles.statNumber}>{skills.technical.length}</Text>
                    <Text style={styles.statLabel}>Compétences</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Icon name="file-document" size={20} color={cvDesign.colorScheme.primary} />
                    <Text style={styles.statNumber}>{projects.length}</Text>
                    <Text style={styles.statLabel}>Projets</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.quickExportButton, { backgroundColor: cvDesign.colorScheme.primary }]}
                  onPress={generatePDF}
                  disabled={isLoading}
                >
                  <Icon name="file-pdf-box" size={20} color="#fff" />
                  <Text style={styles.quickExportText}>Générer PDF</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.quickExportButton, { backgroundColor: cvDesign.colorScheme.secondary }]}
                  onPress={exportWord}
                  disabled={isLoading}
                >
                  <Icon name="microsoft-word" size={20} color="#fff" />
                  <Text style={styles.quickExportText}>Exporter HTML</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        );

      case 'info':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations Personnelles</Text>
              
              {[
                { label: 'Prénom', field: 'firstName', icon: 'account' },
                { label: 'Nom', field: 'lastName', icon: 'account' },
                { label: 'Titre professionnel', field: 'title', icon: 'briefcase' },
                { label: 'Email', field: 'email', icon: 'email', keyboardType: 'email-address' },
                { label: 'Téléphone', field: 'phone', icon: 'phone', keyboardType: 'phone-pad' },
                { label: 'Adresse', field: 'address', icon: 'map-marker' },
                { label: 'LinkedIn', field: 'linkedin', icon: 'linkedin', autoCapitalize: 'none' },
                { label: 'GitHub', field: 'github', icon: 'github', autoCapitalize: 'none' },
                { label: 'Site web / Portfolio', field: 'website', icon: 'web', autoCapitalize: 'none' },
              ].map(({ label, field, icon, keyboardType, autoCapitalize }) => (
                <View key={field} style={styles.inputRow}>
                  <Icon name={icon} size={20} color={cvDesign.colorScheme.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder={label}
                    value={personalInfo[field]}
                    onChangeText={(text) => setPersonalInfo({...personalInfo, [field]: text})}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize || 'sentences'}
                  />
                </View>
              ))}
              
              <View style={styles.inputRow}>
                <Icon name="text" size={20} color={cvDesign.colorScheme.primary} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Résumé professionnel (2-3 phrases)"
                  value={personalInfo.summary}
                  onChangeText={(text) => setPersonalInfo({...personalInfo, summary: text})}
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Afficher le résumé</Text>
                <Switch
                  value={cvDesign.showSummary}
                  onValueChange={(value) => setCvDesign({...cvDesign, showSummary: value})}
                  trackColor={{ false: '#767577', true: cvDesign.colorScheme.primary }}
                />
              </View>
            </View>
          </ScrollView>
        );

      case 'experience':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Expériences professionnelles */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Expériences Professionnelles</Text>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: cvDesign.colorScheme.primary }]}
                  onPress={addExperience}
                >
                  <Icon name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {experiences.map((exp, index) => (
                <View key={exp.id} style={styles.experienceForm}>
                  <View style={styles.formHeader}>
                    <Text style={styles.formNumber}>Expérience #{index + 1}</Text>
                    {experiences.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(experiences, setExperiences, exp.id)}>
                        <Icon name="delete" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Poste / Titre"
                    value={exp.title}
                    onChangeText={(text) => updateItem(experiences, setExperiences, exp.id, 'title', text)}
                  />
                  
                  <View style={styles.rowInputs}>
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="Entreprise"
                      value={exp.company}
                      onChangeText={(text) => updateItem(experiences, setExperiences, exp.id, 'company', text)}
                    />
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="Ville / Pays"
                      value={exp.location}
                      onChangeText={(text) => updateItem(experiences, setExperiences, exp.id, 'location', text)}
                    />
                  </View>
                  
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: cvDesign.colorScheme.primary }]}
                      onPress={() => {
                        setDatePickerField(`exp_start_${exp.id}`);
                        setShowDatePicker(true);
                      }}
                    >
                      <Icon name="calendar-start" size={16} color={cvDesign.colorScheme.primary} />
                      <Text style={[styles.dateButtonText, { color: cvDesign.colorScheme.primary }]}>
                        Début: {formatDate(exp.startDate)}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: cvDesign.colorScheme.secondary }]}
                      onPress={() => {
                        setDatePickerField(`exp_end_${exp.id}`);
                        setShowDatePicker(true);
                      }}
                      disabled={exp.current}
                    >
                      <Icon name="calendar-end" size={16} color={exp.current ? '#ccc' : cvDesign.colorScheme.secondary} />
                      <Text style={[
                        styles.dateButtonText, 
                        { color: exp.current ? '#ccc' : cvDesign.colorScheme.secondary }
                      ]}>
                        Fin: {exp.current ? 'Présent' : formatDate(exp.endDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Poste actuel</Text>
                    <Switch
                      value={exp.current}
                      onValueChange={(value) => updateItem(experiences, setExperiences, exp.id, 'current', value)}
                      trackColor={{ false: '#767577', true: cvDesign.colorScheme.primary }}
                    />
                  </View>
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description (3-4 phrases)"
                    value={exp.description}
                    onChangeText={(text) => updateItem(experiences, setExperiences, exp.id, 'description', text)}
                    multiline
                    numberOfLines={3}
                  />
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Réalisations (une par ligne)"
                    value={exp.achievements ? exp.achievements.join('\n') : ''}
                    onChangeText={(text) => updateItem(experiences, setExperiences, exp.id, 'achievements', text.split('\n'))}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              ))}
            </View>

            {/* Formations */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Formations</Text>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: cvDesign.colorScheme.primary }]}
                  onPress={addEducation}
                >
                  <Icon name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {education.map((edu, index) => (
                <View key={edu.id} style={styles.educationForm}>
                  <View style={styles.formHeader}>
                    <Text style={styles.formNumber}>Formation #{index + 1}</Text>
                    {education.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(education, setEducation, edu.id)}>
                        <Icon name="delete" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Diplôme / Formation"
                    value={edu.degree}
                    onChangeText={(text) => updateItem(education, setEducation, edu.id, 'degree', text)}
                  />
                  
                  <View style={styles.rowInputs}>
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="École / Université"
                      value={edu.school}
                      onChangeText={(text) => updateItem(education, setEducation, edu.id, 'school', text)}
                    />
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="Ville / Pays"
                      value={edu.location}
                      onChangeText={(text) => updateItem(education, setEducation, edu.id, 'location', text)}
                    />
                  </View>
                  
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: cvDesign.colorScheme.primary }]}
                      onPress={() => {
                        setDatePickerField(`edu_start_${edu.id}`);
                        setShowDatePicker(true);
                      }}
                    >
                      <Icon name="calendar-start" size={16} color={cvDesign.colorScheme.primary} />
                      <Text style={[styles.dateButtonText, { color: cvDesign.colorScheme.primary }]}>
                        Début: {formatDate(edu.startDate)}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: cvDesign.colorScheme.secondary }]}
                      onPress={() => {
                        setDatePickerField(`edu_end_${edu.id}`);
                        setShowDatePicker(true);
                      }}
                    >
                      <Icon name="calendar-end" size={16} color={cvDesign.colorScheme.secondary} />
                      <Text style={[styles.dateButtonText, { color: cvDesign.colorScheme.secondary }]}>
                        Fin: {formatDate(edu.endDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description / Mention"
                    value={edu.description}
                    onChangeText={(text) => updateItem(education, setEducation, edu.id, 'description', text)}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              ))}
            </View>

            {/* Projets */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Projets</Text>
                <View style={styles.headerRight}>
                  <Switch
                    value={cvDesign.showProjects}
                    onValueChange={(value) => setCvDesign({...cvDesign, showProjects: value})}
                    trackColor={{ false: '#767577', true: cvDesign.colorScheme.primary }}
                  />
                  <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: cvDesign.colorScheme.primary, marginLeft: 10 }]}
                    onPress={addProject}
                  >
                    <Icon name="plus" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {projects.map((project, index) => (
                <View key={project.id} style={styles.projectForm}>
                  <View style={styles.formHeader}>
                    <Text style={styles.formNumber}>Projet #{index + 1}</Text>
                    {projects.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(projects, setProjects, project.id)}>
                        <Icon name="delete" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Nom du projet"
                    value={project.name}
                    onChangeText={(text) => updateItem(projects, setProjects, project.id, 'name', text)}
                  />
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description du projet"
                    value={project.description}
                    onChangeText={(text) => updateItem(projects, setProjects, project.id, 'description', text)}
                    multiline
                    numberOfLines={3}
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Technologies (séparées par des virgules)"
                    value={project.technologies ? project.technologies.join(', ') : ''}
                    onChangeText={(text) => updateItem(projects, setProjects, project.id, 'technologies', text.split(',').map(t => t.trim()))}
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Lien (GitHub, portfolio, etc.)"
                    value={project.link}
                    onChangeText={(text) => updateItem(projects, setProjects, project.id, 'link', text)}
                  />
                </View>
              ))}
            </View>

            {/* Certifications */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Certifications</Text>
                <View style={styles.headerRight}>
                  <Switch
                    value={cvDesign.showCertifications}
                    onValueChange={(value) => setCvDesign({...cvDesign, showCertifications: value})}
                    trackColor={{ false: '#767577', true: cvDesign.colorScheme.primary }}
                  />
                </View>
              </View>
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Certifications (une par ligne)"
                value={certifications.join('\n')}
                onChangeText={(text) => setCertifications(text.split('\n').filter(c => c.trim() !== ''))}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        );

      case 'skills':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Compétences techniques */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Compétences Techniques</Text>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: cvDesign.colorScheme.primary }]}
                  onPress={addTechnicalSkill}
                >
                  <Icon name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {skills.technical.map((skill, index) => (
                <View key={index} style={styles.skillForm}>
                  <View style={styles.skillHeader}>
                    <TextInput
                      style={[styles.input, styles.skillInput]}
                      placeholder="Nom de la compétence"
                      value={skill.name}
                      onChangeText={(text) => {
                        const newSkills = [...skills.technical];
                        newSkills[index] = { ...newSkills[index], name: text };
                        setSkills({ ...skills, technical: newSkills });
                      }}
                    />
                    
                    {skills.technical.length > 1 && (
                      <TouchableOpacity onPress={() => {
                        const newSkills = skills.technical.filter((_, i) => i !== index);
                        setSkills({ ...skills, technical: newSkills });
                      }}>
                        <Icon name="delete" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.skillControl}>
                    <Text style={styles.skillLevelText}>Niveau: {skill.level}%</Text>
                    <View style={styles.skillSlider}>
                      <View style={styles.sliderTrack}>
                        <View 
                          style={[
                            styles.sliderFill,
                            { 
                              width: `${skill.level}%`,
                              backgroundColor: cvDesign.colorScheme.secondary
                            }
                          ]} 
                        />
                        <TouchableOpacity
                          style={[
                            styles.sliderThumb,
                            { left: `${skill.level}%`, transform: [{ translateX: -8 }] }
                          ]}
                          onPressIn={() => {/* TODO: Implement slider touch */}}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Compétences personnelles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compétences Personnelles</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Compétences personnelles (séparées par des virgules)"
                value={skills.soft.join(', ')}
                onChangeText={(text) => setSkills({ ...skills, soft: text.split(',').map(s => s.trim()).filter(s => s !== '') })}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Langues */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Langues</Text>
              
              {skills.languages.map((lang, index) => (
                <View key={index} style={styles.languageForm}>
                  <View style={styles.rowInputs}>
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="Langue"
                      value={lang.name}
                      onChangeText={(text) => {
                        const newLanguages = [...skills.languages];
                        newLanguages[index] = { ...newLanguages[index], name: text };
                        setSkills({ ...skills, languages: newLanguages });
                      }}
                    />
                    
                    <TextInput
                      style={[styles.input, styles.halfInput]}
                      placeholder="Niveau (ex: Courant, Intermédiaire)"
                      value={lang.level}
                      onChangeText={(text) => {
                        const newLanguages = [...skills.languages];
                        newLanguages[index] = { ...newLanguages[index], level: text };
                        setSkills({ ...skills, languages: newLanguages });
                      }}
                    />
                  </View>
                  
                  {skills.languages.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => {
                        const newLanguages = skills.languages.filter((_, i) => i !== index);
                        setSkills({ ...skills, languages: newLanguages });
                      }}
                    >
                      <Icon name="close" size={16} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              <TouchableOpacity
                style={[styles.addLanguageButton, { borderColor: cvDesign.colorScheme.primary }]}
                onPress={() => {
                  setSkills({ 
                    ...skills, 
                    languages: [...skills.languages, { name: '', level: '' }] 
                  });
                }}
              >
                <Icon name="plus" size={16} color={cvDesign.colorScheme.primary} />
                <Text style={[styles.addLanguageText, { color: cvDesign.colorScheme.primary }]}>
                  Ajouter une langue
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'design':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Templates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Modèles de CV</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[styles.templateCard, cvDesign.template === template.id && styles.selectedTemplate]}
                    onPress={() => {
                      setCvDesign({
                        ...cvDesign,
                        template: template.id,
                        colorScheme: {
                          ...cvDesign.colorScheme,
                          primary: template.colors[0],
                          secondary: template.colors[1]
                        }
                      });
                    }}
                  >
                    <LinearGradient
                      colors={template.colors}
                      style={styles.templateGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Icon name={template.icon} size={30} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.templateName}>{template.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Layout */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mise en page</Text>
              <View style={styles.layoutGrid}>
                {layouts.map((layout) => (
                  <TouchableOpacity
                    key={layout.id}
                    style={styles.layoutOption}
                    onPress={() => setCvDesign({...cvDesign, layout: layout.id})}
                  >
                    <Icon name={layout.icon} size={30} color={cvDesign.layout === layout.id ? cvDesign.colorScheme.primary : '#666'} />
                    <Text style={styles.layoutName}>{layout.name}</Text>
                    <Text style={styles.layoutDescription}>{layout.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Options d'affichage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Options d'affichage</Text>
              
              <View style={styles.displayOptions}>
                {[
                  { label: 'Afficher les graphiques de compétences', value: 'showSkillsChart' },
                  { label: 'Afficher les projets', value: 'showProjects' },
                  { label: 'Afficher les certifications', value: 'showCertifications' },
                ].map((option) => (
                  <View key={option.value} style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{option.label}</Text>
                    <Switch
                      value={cvDesign[option.value]}
                      onValueChange={(value) => setCvDesign({...cvDesign, [option.value]: value})}
                      trackColor={{ false: '#767577', true: cvDesign.colorScheme.primary }}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Format PDF */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Format PDF</Text>
              
              <View style={styles.pdfOptions}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Marges de la page</Text>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderValue}>{cvDesign.pageMargins}mm</Text>
                    <View style={styles.sliderTrack}>
                      <View 
                        style={[
                          styles.sliderFill,
                          { 
                            width: `${((cvDesign.pageMargins - 10) / 30) * 100}%`,
                            backgroundColor: cvDesign.colorScheme.secondary
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Espacement des lignes</Text>
                  <View style={styles.spacingButtons}>
                    {[1.0, 1.2, 1.5, 1.8].map((spacing) => (
                      <TouchableOpacity
                        key={spacing}
                        style={[
                          styles.spacingButton,
                          Math.abs(cvDesign.lineSpacing - spacing) < 0.1 && { 
                            backgroundColor: cvDesign.colorScheme.primary 
                          }
                        ]}
                        onPress={() => setCvDesign({...cvDesign, lineSpacing: spacing})}
                      >
                        <Text style={[
                          styles.spacingButtonText,
                          Math.abs(cvDesign.lineSpacing - spacing) < 0.1 && { color: '#fff' }
                        ]}>
                          {spacing}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Taille de police</Text>
                  <View style={styles.fontSizeButtons}>
                    {['petite', 'normale', 'grande'].map((size) => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.fontSizeButton,
                          cvDesign.fontSize === size && { backgroundColor: cvDesign.colorScheme.primary }
                        ]}
                        onPress={() => setCvDesign({...cvDesign, fontSize: size})}
                      >
                        <Text style={[
                          styles.fontSizeButtonText,
                          cvDesign.fontSize === size && { color: '#fff' }
                        ]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case 'export':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exporter le CV</Text>
              
              <View style={styles.exportOptions}>
                <Text style={styles.exportSubtitle}>Format d'export</Text>
                
                <TouchableOpacity
                  style={[styles.exportButton, { backgroundColor: cvDesign.colorScheme.primary }]}
                  onPress={generatePDF}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Icon name="file-pdf-box" size={24} color="#fff" />
                      <View style={styles.exportButtonContent}>
                        <Text style={styles.exportButtonTitle}>Générer PDF Professionnel</Text>
                        <Text style={styles.exportButtonDesc}>
                          Format A4 • Optimisé ATS • Prêt à imprimer
                        </Text>
                      </View>
                      <Icon name="download" size={24} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.exportButton, { backgroundColor: cvDesign.colorScheme.secondary }]}
                  onPress={exportWord}
                  disabled={isLoading}
                >
                  <Icon name="microsoft-word" size={24} color="#fff" />
                  <View style={styles.exportButtonContent}>
                    <Text style={styles.exportButtonTitle}>Exporter en HTML (Word)</Text>
                    <Text style={styles.exportButtonDesc}>
                      Compatible Microsoft Word • Éditable
                    </Text>
                  </View>
                  <Icon name="download" size={24} color="#fff" />
                </TouchableOpacity>
                
                {/* Conseils ATS */}
                <View style={styles.atsTips}>
                  <Text style={styles.tipsTitle}>💡 Conseils pour les systèmes ATS</Text>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color="#27ae60" />
                    <Text style={styles.tipText}>
                      Utilisez des titres standard (Expérience, Formation, Compétences)
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color="#27ae60" />
                    <Text style={styles.tipText}>
                      Incluez des mots-clés pertinents pour votre secteur
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color="#27ae60" />
                    <Text style={styles.tipText}>
                      Évitez les tableaux, images et polices fantaisistes
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color="#27ae60" />
                    <Text style={styles.tipText}>
                      Sauvegardez toujours en PDF pour préserver la mise en forme
                    </Text>
                  </View>
                </View>
                
                {/* Statistiques du CV */}
                <View style={styles.cvStats}>
                  <Text style={styles.statsTitle}>📊 Votre CV en chiffres</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{experiences.length}</Text>
                      <Text style={styles.statLabel}>Expériences</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{education.length}</Text>
                      <Text style={styles.statLabel}>Formations</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{skills.technical.length}</Text>
                      <Text style={styles.statLabel}>Compétences</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{projects.length}</Text>
                      <Text style={styles.statLabel}>Projets</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* En-tête */}
      <View style={styles.header}>

          <Text style={styles.headerTitle}>GÉNÉRATEUR DE CV</Text>
          <Text style={styles.headerSubtitle}>Professionnel • Personnalisable • ATS Friendly</Text>
        
      </View>

      {/* Navigation avec onglets améliorés */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                activeTab === tab.id && styles.activeTabButton,
                activeTab === tab.id && { backgroundColor: cvDesign.colorScheme.primary }
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Icon
                name={tab.icon}
                size={20}
                color={activeTab === tab.id ? '#fff' : '#666'}
                style={styles.tabIcon}
              />
              <Text style={[
                styles.tabButtonText,
                activeTab === tab.id && styles.activeTabButtonText
              ]}>
                {tab.label}
              </Text>
              
              {activeTab === tab.id && (
                <View style={[styles.tabIndicator, { backgroundColor: cvDesign.colorScheme.secondary }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Contenu principal */}
      {renderContent()}

      {/* Date Picker */}
      {showDatePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const formattedDate = selectedDate.toISOString().split('T')[0];
                    
                    // Déterminer quel champ mettre à jour
                    if (datePickerField.startsWith('exp_start_')) {
                      const expId = datePickerField.replace('exp_start_', '');
                      updateItem(experiences, setExperiences, expId, 'startDate', formattedDate);
                    } else if (datePickerField.startsWith('exp_end_')) {
                      const expId = datePickerField.replace('exp_end_', '');
                      updateItem(experiences, setExperiences, expId, 'endDate', formattedDate);
                    } else if (datePickerField.startsWith('edu_start_')) {
                      const eduId = datePickerField.replace('edu_start_', '');
                      updateItem(education, setEducation, eduId, 'startDate', formattedDate);
                    } else if (datePickerField.startsWith('edu_end_')) {
                      const eduId = datePickerField.replace('edu_end_', '');
                      updateItem(education, setEducation, eduId, 'endDate', formattedDate);
                    }
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.datePickerClose, { backgroundColor: cvDesign.colorScheme.primary }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCloseText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Indicateur de chargement */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Génération du CV en cours...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#3498db',
    borderBottomWidth: 1,
    borderBottomColor: '#3498db',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // Onglets améliorés
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabsScrollContent: {
    paddingHorizontal: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
    position: 'relative',
  },
  activeTabButton: {
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -8,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 1.5,
  },
  // Contenu
  content: {
    flex: 1,
  },
  // Onglet Aperçu
  previewTab: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  previewHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
    padding: 15,
  },
  previewStats: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  quickExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickExportText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Section commune
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Aperçu CV complet
  cvPreview: {
    width: '100%',
    minHeight: 800,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerPreview: {
    paddingBottom: 15,
    borderBottomWidth: 3,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  namePreview: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  titlePreview: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  contactPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    fontSize: 10,
  },
  sectionPreview: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  sectionText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#333',
  },
  experienceItem: {
    marginBottom: 15,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  experienceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  experienceCompany: {
    fontSize: 11,
    color: '#666',
  },
  experienceDate: {
    fontSize: 10,
    color: '#888',
  },
  experienceDescription: {
    fontSize: 10,
    color: '#333',
    lineHeight: 14,
    marginTop: 3,
  },
  achievementsList: {
    marginTop: 5,
    paddingLeft: 15,
  },
  achievementText: {
    fontSize: 9,
    color: '#555',
    lineHeight: 12,
    marginBottom: 2,
  },
  educationItem: {
    marginBottom: 15,
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  educationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  educationSchool: {
    fontSize: 11,
    color: '#666',
  },
  educationDate: {
    fontSize: 10,
    color: '#888',
  },
  educationDescription: {
    fontSize: 10,
    color: '#333',
    lineHeight: 14,
    marginTop: 3,
  },
  skillsGrid: {
    gap: 8,
  },
  skillItem: {
    marginBottom: 6,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  skillName: {
    fontSize: 10,
    fontWeight: '600',
  },
  skillPercentage: {
    fontSize: 9,
    color: '#666',
  },
  skillBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillLevel: {
    height: '100%',
    borderRadius: 3,
  },
  softSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  softSkillTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  softSkillText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  languagesList: {
    gap: 6,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  languageName: {
    fontSize: 10,
    fontWeight: '600',
  },
  languageLevel: {
    fontSize: 9,
    color: '#666',
  },
  projectItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  projectName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  projectDescription: {
    fontSize: 10,
    color: '#555',
    lineHeight: 14,
    marginBottom: 5,
  },
  projectTech: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  techTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  techText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '600',
  },
  certificationsList: {
    gap: 4,
  },
  certificationText: {
    fontSize: 10,
    color: '#333',
    lineHeight: 14,
  },
  // Styles de formulaire existants (maintenus de votre code précédent)
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  halfInput: {
    flex: 1,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  formNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  experienceForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  educationForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  projectForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Compétences
  skillForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  skillInput: {
    flex: 1,
    marginBottom: 0,
  },
  skillControl: {
    marginTop: 10,
  },
  skillLevelText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  skillSlider: {
    height: 30,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  languageForm: {
    marginBottom: 12,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    right: 0,
    top: 12,
  },
  addLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 8,
  },
  addLanguageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Design
  templatesScroll: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  templateCard: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  selectedTemplate: {
    transform: [{ scale: 1.05 }],
  },
  templateGradient: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  layoutOption: {
    width: (width - 60) / 2,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  layoutName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  layoutDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  displayOptions: {
    gap: 12,
  },
  pdfOptions: {
    gap: 15,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 2,
  },
  sliderValue: {
    fontSize: 12,
    color: '#666',
    minWidth: 30,
  },
  spacingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  spacingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  spacingButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  fontSizeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  fontSizeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  // Export
  exportOptions: {
    gap: 20,
  },
  exportSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 15,
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  exportButtonDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  atsTips: {
    backgroundColor: '#e8f4fc',
    padding: 20,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  cvStats: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  // Date Picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  datePickerClose: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  datePickerCloseText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Chargement
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },
});

export default CurriculumVitae;