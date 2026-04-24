/// <reference types="node" />

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  const password = await bcrypt.hash("Test@1234", 10);

  // ── Roles & permissions ──────────────────────────────────
  const roleData = [
    { nom: "admin", description: "Administrateur système" },
    { nom: "enseignant", description: "Enseignant" },
    { nom: "etudiant", description: "Étudiant" },
  ];

  const roles: Record<string, { id: number; nom: string | null }> = {};
  for (const r of roleData) {
    const role = await prisma.role.upsert({
      where: { id: (await prisma.role.findFirst({ where: { nom: r.nom } }))?.id ?? 0 },
      update: {},
      create: r,
    });
    roles[r.nom] = role;
  }
  console.log("✅ Roles created");

  // ── Permissions ──────────────────────────────────────────
  const permData = [
    { nom: "manage_users", description: "Gérer les utilisateurs", module: "auth", action: "manage" },
    { nom: "manage_pfe", description: "Gérer les PFE", module: "pfe", action: "manage" },
    { nom: "submit_pfe", description: "Soumettre un PFE", module: "pfe", action: "submit" },
    { nom: "view_documents", description: "Consulter les documents", module: "documents", action: "view" },
    { nom: "manage_discipline", description: "Gérer les dossiers disciplinaires", module: "discipline", action: "manage" },
    { nom: "submit_reclamation", description: "Soumettre une réclamation", module: "reclamations", action: "submit" },
    { nom: "manage_annonces", description: "Gérer les annonces", module: "annonces", action: "manage" },
  ];

  for (const p of permData) {
    await prisma.permission.upsert({
      where: { id: (await prisma.permission.findFirst({ where: { nom: p.nom } }))?.id ?? 0 },
      update: {},
      create: p,
    });
  }
  console.log("✅ Permissions created");

  // ── Site settings (singleton) ───────────────────────────
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      universityNameAr: "جامعة ابن خلدون",
      universityNameEn: "Ibn Khaldoun University",
      universityNameFr: "Université Ibn Khaldoun",
      universitySubtitleAr: "كلية الرياضيات والإعلام الآلي",
      universitySubtitleEn: "Faculty of Mathematics and Computer Science",
      universitySubtitleFr: "Faculté des Mathématiques et d'Informatique",
      cityAr: "تيارت",
      cityEn: "Tiaret",
      cityFr: "Tiaret",
      heroStudentsStat: "2500+",
      heroTeachersStat: "150+",
      heroCoursesStat: "200+",
      heroSatisfactionStat: "98%",
      bannerStudentsStat: "28K+",
      bannerTeachersStat: "1.1K+",
      bannerFacultiesStat: "8",
      bannerNationalRankStat: "15th",
      statisticsStudentsStat: "2500+",
      statisticsTeachersStat: "150+",
      statisticsProjectsStat: "500+",
      statisticsSatisfactionStat: "98%",
      statisticsQuoteAr: "تمكين التعليم عبر التكنولوجيا",
      statisticsQuoteEn: "Empowering education through technology",
      statisticsQuoteFr: "Autonomiser l'éducation grâce à la technologie",
      aboutLine1Ar: "جامعة ابن خلدون - تيارت، كلية الرياضيات والإعلام الآلي",
      aboutLine1En: "Ibn Khaldoun University - Tiaret, Faculty of Mathematics and Computer Science",
      aboutLine1Fr: "Université Ibn Khaldoun - Tiaret, Faculté des Mathématiques et d'Informatique",
      aboutLine2Ar: "تأسست سنة 1980 ومكرسة للتميز في التعليم والبحث العلمي.",
      aboutLine2En: "Established in 1980, dedicated to excellence in education and research.",
      aboutLine2Fr: "Fondée en 1980, dédiée à l'excellence en enseignement et en recherche.",
      contactPhone: "+213 555 55 55 55",
      contactEmail: "info@univ-tiaret.dz",
      contactAddressAr: "تيارت، الجزائر",
      contactAddressEn: "Tiaret, Algeria",
      contactAddressFr: "Tiaret, Algérie",
    },
  });
  console.log("✅ Site settings seeded");

  // ── University structure ─────────────────────────────────
  const faculte = await prisma.faculte.create({
    data: {
      nom_ar: "كلية العلوم والتكنولوجيا",
      nom_en: "Faculty of Science and Technology",
    },
  });

  const deptInfo = await prisma.departement.create({
    data: {
      nom_ar: "الإعلام الآلي",
      nom_en: "Computer Science",
      faculteId: faculte.id,
    },
  });

  await prisma.departement.create({
    data: {
      nom_ar: "الفيزياء",
      nom_en: "Physics",
      faculteId: faculte.id,
    },
  });

  const filiereInfo = await prisma.filiere.create({
    data: {
      nom_ar: "شعبة الإعلام الآلي",
      nom_en: "Computer Science Track",
      departementId: deptInfo.id,
      description_ar: "شعبة الإعلام الآلي",
      description_en: "Computer science stream",
    },
  });

  const specISI = await prisma.specialite.create({
    data: {
      nom_ar: "ISI",
      nom_en: "ISI",
      filiereId: filiereInfo.id,
      niveau: "M2",
    },
  });

  await prisma.specialite.create({
    data: {
      nom_ar: "SIC",
      nom_en: "SIC",
      filiereId: filiereInfo.id,
      niveau: "M2",
    },
  });

  const promo2025 = await prisma.promo.create({
    data: {
      nom_ar: "M2 ISI 2024-2025",
      nom_en: "M2 ISI 2024-2025",
      specialiteId: specISI.id,
      anneeUniversitaire: "2024-2025",
      section: "A",
    },
  });

  const promo2025B = await prisma.promo.create({
    data: {
      nom_ar: "M2 ISI 2024-2025",
      nom_en: "M2 ISI 2024-2025",
      specialiteId: specISI.id,
      anneeUniversitaire: "2024-2025",
      section: "B",
    },
  });

  console.log("✅ University structure created (Faculté → Département → Filière → Spécialité → Promo)");

  // ── Grades ───────────────────────────────────────────────
  const gradeMAA = await prisma.grade.create({
    data: {
      nom_ar: "أستاذ مساعد أ",
      nom_en: "Assistant Professor A",
      description_ar: "رتبة أستاذ مساعد أ",
      description_en: "Academic rank: Assistant Professor A",
    },
  });
  const gradeMCA = await prisma.grade.create({
    data: {
      nom_ar: "أستاذ محاضر أ",
      nom_en: "Associate Professor A",
      description_ar: "رتبة أستاذ محاضر أ",
      description_en: "Academic rank: Associate Professor A",
    },
  });
  await prisma.grade.create({
    data: {
      nom_ar: "أستاذ",
      nom_en: "Professor",
      description_ar: "رتبة أستاذ",
      description_en: "Academic rank: Professor",
    },
  });

  console.log("✅ Grades created");

  // ── Helper: create user + assign roles ───────────────────
  async function createUser(data: {
    email: string;
    nom: string;
    prenom: string;
    roleNames: string[];
    emailVerified?: boolean;
    enseignantData?: { gradeId: number };
    etudiantData?: { promoId: number; matricule: string };
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstUse: false,
          emailVerified: data.emailVerified ?? true,
          status: "active",
        },
      });
      console.log(`  ⏭️  ${data.email} already exists`);
      return existing;
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password,
        nom: data.nom,
        prenom: data.prenom,
        emailVerified: data.emailVerified ?? true,
        firstUse: false,
        ...(data.enseignantData
          ? { enseignant: { create: { gradeId: data.enseignantData.gradeId } } }
          : {}),
        ...(data.etudiantData
          ? { etudiant: { create: { promoId: data.etudiantData.promoId, matricule: data.etudiantData.matricule } } }
          : {}),
      },
    });

    // Assign roles
    for (const roleName of data.roleNames) {
      const role = roles[roleName];
      if (role) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
      }
    }

    console.log(`  ✅ [${data.roleNames.join(", ")}] ${data.email}`);
    return user;
  }

  // ── Users ────────────────────────────────────────────────
  console.log("\n👤 Creating users (password for all: Test@1234)\n");

  await createUser({
    email: "admin@univ-tiaret.dz",
    nom: "Super",
    prenom: "Admin",
    roleNames: ["admin"],
  });

  await createUser({
    email: "teacher@univ-tiaret.dz",
    nom: "Benali",
    prenom: "Youcef",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMCA.id },
  });

  await createUser({
    email: "teacher2@univ-tiaret.dz",
    nom: "Mebarki",
    prenom: "Nadia",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMAA.id },
  });

  await createUser({
    email: "teacher3@univ-tiaret.dz",
    nom: "Khelifa",
    prenom: "Ahmed",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMCA.id },
  });

  await createUser({
    email: "teacher4@univ-tiaret.dz",
    nom: "Bouzid",
    prenom: "Fatima",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMAA.id },
  });

  await createUser({
    email: "teacher5@univ-tiaret.dz",
    nom: "Taleb",
    prenom: "Mohamed",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMCA.id },
  });

  await createUser({
    email: "teacher6@univ-tiaret.dz",
    nom: "Ziani",
    prenom: "Leila",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMAA.id },
  });

  await createUser({
    email: "student@univ-tiaret.dz",
    nom: "Bensalem",
    prenom: "Amira",
    roleNames: ["etudiant"],
    etudiantData: { promoId: promo2025.id, matricule: "212131234567" },
  });

  await createUser({
    email: "student2@univ-tiaret.dz",
    nom: "Mehdaoui",
    prenom: "Yacine",
    roleNames: ["etudiant"],
    etudiantData: { promoId: promo2025B.id, matricule: "212131234568" },
  });

  await createUser({
    email: "student3@univ-tiaret.dz",
    nom: "Djeraba",
    prenom: "Sara",
    roleNames: ["etudiant"],
    etudiantData: { promoId: promo2025.id, matricule: "212131234569" },
  });

  // ── Direct assignments: teachers ↔ promos/modules/groups, students ↔ promo/section/groups ──
  const teacherUser = await prisma.user.findUnique({
    where: { email: "teacher@univ-tiaret.dz" },
    include: { enseignant: true },
  });
  const teacher2User = await prisma.user.findUnique({
    where: { email: "teacher2@univ-tiaret.dz" },
    include: { enseignant: true },
  });
  const studentUser = await prisma.user.findUnique({
    where: { email: "student@univ-tiaret.dz" },
    include: { etudiant: true },
  });
  const student2User = await prisma.user.findUnique({
    where: { email: "student2@univ-tiaret.dz" },
    include: { etudiant: true },
  });
  const student3User = await prisma.user.findUnique({
    where: { email: "student3@univ-tiaret.dz" },
    include: { etudiant: true },
  });

  if (
    !teacherUser?.enseignant?.id ||
    !teacher2User?.enseignant?.id ||
    !studentUser?.etudiant?.id ||
    !student2User?.etudiant?.id ||
    !student3User?.etudiant?.id
  ) {
    throw new Error("Missing enseignant/etudiant records required for direct assignments.");
  }

  const moduleAlgo = await prisma.module.upsert({
    where: { code: "ISI-M2-ALGO-ADV" },
    update: {},
    create: {
      nom_ar: "الخوارزميات المتقدمة",
      nom_en: "Advanced Algorithms",
      code: "ISI-M2-ALGO-ADV",
      semestre: 3,
      specialiteId: specISI.id,
      volumeCours: 24,
      volumeTd: 18,
      volumeTp: 0,
      credit: 6,
      coef: 3,
      description_ar: "وحدة تعليمية أساسية لطلبة ماستر 2 ISI",
      description_en: "Core unit for M2 ISI students",
    },
  });

  const moduleCloud = await prisma.module.upsert({
    where: { code: "ISI-M2-CLOUD" },
    update: {},
    create: {
      nom_ar: "الحوسبة السحابية وDevOps",
      nom_en: "Cloud and DevOps",
      code: "ISI-M2-CLOUD",
      semestre: 3,
      specialiteId: specISI.id,
      volumeCours: 20,
      volumeTd: 10,
      volumeTp: 14,
      credit: 5,
      coef: 2,
      description_ar: "البنية السحابية والتكامل المستمر",
      description_en: "Cloud infrastructure and continuous integration",
    },
  });

  const moduleAI = await prisma.module.upsert({
    where: { code: "ISI-M2-AI" },
    update: {},
    create: {
      nom_ar: "الذكاء الاصطناعي التطبيقي",
      nom_en: "Applied AI",
      code: "ISI-M2-AI",
      semestre: 3,
      specialiteId: specISI.id,
      volumeCours: 18,
      volumeTd: 12,
      volumeTp: 12,
      credit: 5,
      coef: 2,
      description_ar: "طرق الذكاء الاصطناعي للتطبيقات المهنية",
      description_en: "AI methods for business applications",
    },
  });

  const ensureEnseignement = async (enseignantId: number, moduleId: number, promoId: number, type: "cours" | "td" | "tp") => {
    const existing = await prisma.enseignement.findFirst({
      where: {
        enseignantId,
        moduleId,
        promoId,
        type,
        anneeUniversitaire: "2024-2025",
      },
    });

    if (existing) return existing;

    return prisma.enseignement.create({
      data: {
        enseignantId,
        moduleId,
        promoId,
        type,
        anneeUniversitaire: "2024-2025",
      },
    });
  };

  await ensureEnseignement(teacherUser.enseignant.id, moduleAlgo.id, promo2025.id, "cours");
  await ensureEnseignement(teacherUser.enseignant.id, moduleCloud.id, promo2025.id, "td");
  await ensureEnseignement(teacher2User.enseignant.id, moduleAI.id, promo2025B.id, "cours");
  await ensureEnseignement(teacher2User.enseignant.id, moduleCloud.id, promo2025B.id, "tp");

  const defaultDocumentTypes = [
    {
      nomAr: "شهادة عمل",
      nomEn: "Work Certificate",
      categorie: "administratif",
      descriptionAr: "وثيقة تثبت مزاولة مهام التدريس داخل المؤسسة.",
      descriptionEn: "Document certifying active teaching duties at the institution.",
    },
    {
      nomAr: "شهادة تدريس",
      nomEn: "Teaching Assignment Certificate",
      categorie: "enseignement",
      descriptionAr: "وثيقة توضح الوحدات والأفواج المكلف بها الأستاذ.",
      descriptionEn: "Certificate listing assigned modules and teaching groups.",
    },
    {
      nomAr: "قرار العطلة العلمية",
      nomEn: "Academic Leave Decision",
      categorie: "scientifique",
      descriptionAr: "وثيقة إدارية خاصة بالعطلة العلمية أو البحثية.",
      descriptionEn: "Administrative document related to scientific/academic leave.",
    },
    {
      nomAr: "إفادة المشاركة البيداغوجية",
      nomEn: "Pedagogical Participation Attestation",
      categorie: "pedagogique",
      descriptionAr: "إفادة بالمشاركة في اللجان أو الأنشطة البيداغوجية.",
      descriptionEn: "Attestation of participation in pedagogical committees or activities.",
    },
    {
      nomAr: "وثيقة إدارية أخرى",
      nomEn: "Other Administrative Document",
      categorie: "autre",
      descriptionAr: "أي وثيقة غير مصنفة ضمن الأنواع السابقة.",
      descriptionEn: "Any document not covered by other categories.",
    },
  ];

  const ensureDocumentType = async (item: (typeof defaultDocumentTypes)[number]) => {
    const existing = await prisma.documentType.findFirst({
      where: {
        nom_en: item.nomEn,
        categorie: item.categorie as any,
      },
      select: { id: true },
    });

    if (existing) return;

    await prisma.documentType.create({
      data: {
        nom_ar: item.nomAr,
        nom_en: item.nomEn,
        categorie: item.categorie as any,
        description_ar: item.descriptionAr,
        description_en: item.descriptionEn,
      },
    });
  };

  for (const item of defaultDocumentTypes) {
    await ensureDocumentType(item);
  }

  // ── Disciplinary infractions ─────────────────────────────────────────
  const defaultInfractions = [
    {
      nom_ar: "غش في الامتحانات",
      nom_en: "Exam Fraud",
      description_ar: "محاولة الغش أو النسخ في الامتحانات والاختبارات.",
      description_en: "Attempting to cheat or copy during exams and tests.",
      gravite: "faible",
    },
    {
      nom_ar: "رفض الطاعة",
      nom_en: "Refusal to Obey",
      description_ar: "عدم الامتثال لتعليمات الأساتذة أو الإدارة.",
      description_en: "Failure to comply with instructions from teachers or administration.",
      gravite: "moyenne",
    },
    {
      nom_ar: "تصحيح مزدوج غير مبرر",
      nom_en: "Unfounded Double Correction",
      description_ar: "طلب تصحيح إضافي بدون مبررات مقنعة.",
      description_en: "Requesting additional correction without valid justifications.",
      gravite: "moyenne",
    },
    {
      nom_ar: "تكرار الجريمة من الدرجة الأولى",
      nom_en: "1st Degree Recidivism",
      description_ar: "تكرار مخالفة تأديبية سابقة من الدرجة الأولى.",
      description_en: "Recurrence of a previous first-degree disciplinary offense.",
      gravite: "grave",
    },
    {
      nom_ar: "فوضى منظمة",
      nom_en: "Organized Disorder",
      description_ar: "تنظيم أو المشاركة في أعمال فوضى جماعية.",
      description_en: "Organizing or participating in collective acts of disorder.",
      gravite: "grave",
    },
    {
      nom_ar: "عنف وتهديدات",
      nom_en: "Violence and Threats",
      description_ar: "استخدام العنف الجسدي أو التهديدات ضد الآخرين.",
      description_en: "Use of physical violence or threats against others.",
      gravite: "grave",
    },
    {
      nom_ar: "حيازة وسائل ضارة",
      nom_en: "Harmful Means Possession",
      description_ar: "حيازة أدوات أو مواد ضارة داخل المؤسسة.",
      description_en: "Possession of harmful tools or substances within the institution.",
      gravite: "grave",
    },
    {
      nom_ar: "تزوير وثائق",
      nom_en: "Document Forgery",
      description_ar: "تزوير أو التلاعب في الوثائق الرسمية.",
      description_en: "Forgery or manipulation of official documents.",
      gravite: "tres_grave",
    },
    {
      nom_ar: "انتحال شخصية",
      nom_en: "Identity Usurpation",
      description_ar: "انتحال شخصية شخص آخر أو التظاهر بغير الهوية الحقيقية.",
      description_en: "Impersonating another person or assuming a false identity.",
      gravite: "tres_grave",
    },
    {
      nom_ar: "تشهير",
      nom_en: "Defamation",
      description_ar: "نشر معلومات كاذبة تضر بسمعة الآخرين.",
      description_en: "Spreading false information that harms others' reputation.",
      gravite: "grave",
    },
    {
      nom_ar: "تعطيل بيداغوجي",
      nom_en: "Pedagogical Disruption",
      description_ar: "تعطيل سير العملية التعليمية عمداً.",
      description_en: "Deliberately disrupting the educational process.",
      gravite: "grave",
    },
    {
      nom_ar: "سرقة واختلاس",
      nom_en: "Theft and Misappropriation",
      description_ar: "سرقة ممتلكات المؤسسة أو اختلاس أموال.",
      description_en: "Theft of institutional property or embezzlement of funds.",
      gravite: "tres_grave",
    },
    {
      nom_ar: "تدهور الممتلكات",
      nom_en: "Property Deterioration",
      description_ar: "إتلاف أو تخريب ممتلكات المؤسسة عمداً.",
      description_en: "Deliberate damage or destruction of institutional property.",
      gravite: "grave",
    },
    {
      nom_ar: "إهانات للموظفين/الطلاب",
      nom_en: "Insults to Staff/Students",
      description_ar: "إهانة أو سب الموظفين أو الطلاب.",
      description_en: "Insulting or verbally abusing staff or students.",
      gravite: "grave",
    },
    {
      nom_ar: "رفض الرقابة التنظيمية",
      nom_en: "Regulatory Control Refusal",
      description_ar: "رفض الامتثال للرقابة الإدارية أو الأمنية.",
      description_en: "Refusal to comply with administrative or security oversight.",
      gravite: "grave",
    },
    {
      nom_ar: "فوضى منظمة",
      nom_en: "Organized Disorder",
      description_ar: "تنظيم أو المشاركة في أعمال فوضى جماعية.",
      description_en: "Organizing or participating in collective acts of disorder.",
      gravite: "grave",
    },
    {
      nom_ar: "عنف وتهديدات",
      nom_en: "Violence and Threats",
      description_ar: "استخدام العنف الجسدي أو التهديدات ضد الآخرين.",
      description_en: "Use of physical violence or threats against others.",
      gravite: "grave",
    },
    {
      nom_ar: "حيازة وسائل ضارة",
      nom_en: "Harmful Means Possession",
      description_ar: "حيازة أدوات أو مواد ضارة داخل المؤسسة.",
      description_en: "Possession of harmful tools or substances within the institution.",
      gravite: "grave",
    },
    {
      nom_ar: "تزوير وثائق",
      nom_en: "Document Forgery",
      description_ar: "تزوير أو التلاعب في الوثائق الرسمية.",
      description_en: "Forgery or manipulation of official documents.",
      gravite: "tres_grave",
    },
    {
      nom_ar: "انتحال شخصية",
      nom_en: "Identity Usurpation",
      description_ar: "انتحال شخصية شخص آخر أو التظاهر بغير الهوية الحقيقية.",
      description_en: "Impersonating another person or assuming a false identity.",
      gravite: "tres_grave",
    },
    {
      nom_ar: "تشهير",
      nom_en: "Defamation",
      description_ar: "نشر معلومات كاذبة تضر بسمعة الآخرين.",
      description_en: "Spreading false information that harms others' reputation.",
      gravite: "grave",
    },
    {
      nom_ar: "تعطيل بيداغوجي",
      nom_en: "Pedagogical Disruption",
      description_ar: "تعطيل سير العملية التعليمية عمداً.",
      description_en: "Deliberately disrupting the educational process.",
      gravite: "grave",
    },
    {
      nom_ar: "سرقة واختلاس",
      nom_en: "Theft and Misappropriation",
      description_ar: "سرقة ممتلكات المؤسسة أو اختلاس أموال.",
      description_en: "Theft of institutional property or embezzlement of funds.",
      gravite: "tres_grave",
    },
    {
      nom_ar: "تدهور الممتلكات",
      nom_en: "Property Deterioration",
      description_ar: "إتلاف أو تخريب ممتلكات المؤسسة عمداً.",
      description_en: "Deliberate damage or destruction of institutional property.",
      gravite: "grave",
    },
    {
      nom_ar: "إهانات للموظفين/الطلاب",
      nom_en: "Insults to Staff/Students",
      description_ar: "إهانة أو سب الموظفين أو الطلاب.",
      description_en: "Insulting or verbally abusing staff or students.",
      gravite: "grave",
    },
    {
      nom_ar: "رفض الرقابة التنظيمية",
      nom_en: "Regulatory Control Refusal",
      description_ar: "رفض الامتثال للرقابة الإدارية أو الأمنية.",
      description_en: "Refusal to comply with administrative or security oversight.",
      gravite: "grave",
    },
  ];

  const ensureInfraction = async (item: {
    nom_ar: string;
    nom_en: string;
    description_ar: string;
    description_en: string;
    gravite: string;
  }) => {
    const existing = await prisma.infraction.findFirst({
      where: {
        OR: [
          { nom_ar: item.nom_ar },
          { nom_en: item.nom_en },
        ],
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.infraction.create({
      data: {
        nom_ar: item.nom_ar,
        nom_en: item.nom_en,
        description_ar: item.description_ar,
        description_en: item.description_en,
        gravite: item.gravite as any,
      },
    });
  };

  for (const item of defaultInfractions) {
    await ensureInfraction(item);
  }
  console.log("✅ Disciplinary infractions seeded");

  // ── Disciplinary decisions ────────────────────────────────────────────
  const defaultDecisions = [
    {
      nom_ar: "تنبيه شفهي",
      nom_en: "Verbal Warning",
      description_ar: "تحذير شفهي للطالب.",
      description_en: "Verbal warning to the student.",
      niveauSanction: "avertissement",
    },
    {
      nom_ar: "تنبيه كتابي",
      nom_en: "Written Warning",
      description_ar: "تحذير كتابي رسمي للطالب.",
      description_en: "Formal written warning to the student.",
      niveauSanction: "avertissement",
    },
    {
      nom_ar: "تسجيل اللوم في الملف",
      nom_en: "Blame on File",
      description_ar: "تسجيل اللوم في الملف التأديبي للطالب.",
      description_en: "Recording of blame in the student's disciplinary file.",
      niveauSanction: "blame",
    },
    {
      nom_ar: "صفر في الامتحان (للغش فقط)",
      nom_en: "Zero on Exam (fraud only)",
      description_ar: "منح علامة صفر في الامتحان بسبب الغش.",
      description_en: "Awarding zero marks on the exam due to fraud.",
      niveauSanction: "suspension",
    },
    {
      nom_ar: "استبعاد من الوحدة",
      nom_en: "Module Exclusion",
      description_ar: "استبعاد من وحدة دراسية معينة.",
      description_en: "Exclusion from a specific study module.",
      niveauSanction: "suspension",
    },
    {
      nom_ar: "استبعاد من الفصل الدراسي",
      nom_en: "Semester Exclusion",
      description_ar: "استبعاد من الفصل الدراسي الحالي.",
      description_en: "Exclusion from the current semester.",
      niveauSanction: "suspension",
    },
    {
      nom_ar: "استبعاد من السنة الدراسية",
      nom_en: "Year Exclusion",
      description_ar: "استبعاد من السنة الدراسية الحالية.",
      description_en: "Exclusion from the current academic year.",
      niveauSanction: "exclusion",
    },
    {
      nom_ar: "استبعاد لمدة سنتين",
      nom_en: "Two-Year Exclusion",
      description_ar: "استبعاد من المؤسسة لمدة سنتين.",
      description_en: "Exclusion from the institution for two years.",
      niveauSanction: "exclusion",
    },
    {
      nom_ar: "استبعاد نهائي من المؤسسة",
      nom_en: "Institution-Wide Exclusion",
      description_ar: "استبعاد نهائي ودائم من المؤسسة.",
      description_en: "Permanent and definitive exclusion from the institution.",
      niveauSanction: "exclusion",
    },
  ];

  const ensureDecision = async (item: {
    nom_ar: string;
    nom_en: string;
    description_ar: string;
    description_en: string;
    niveauSanction: string;
  }) => {
    const existing = await prisma.decision.findFirst({
      where: {
        OR: [
          { nom_ar: item.nom_ar },
          { nom_en: item.nom_en },
        ],
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.decision.create({
      data: {
        nom_ar: item.nom_ar,
        nom_en: item.nom_en,
        description_ar: item.description_ar,
        description_en: item.description_en,
        niveauSanction: item.niveauSanction as any,
      },
    });
  };

  for (const item of defaultDecisions) {
    await ensureDecision(item);
  }
  console.log("✅ Disciplinary decision catalog seeded");

  console.log("✅ Default document types ensured");

  const sujet1 = await prisma.pfeSujet.create({
    data: {
      titre_ar: "منصة ذكية لإدارة الشكاوى",
      titre_en: "Smart Complaint Management Platform",
      description_ar: "تصميم منصة ويب مع مسارات عمل مؤتمتة.",
      description_en: "Design of a web platform with automated workflows.",
      keywords_ar: "شكاوى، منصة، سير عمل",
      keywords_en: "complaints, platform, workflow",
      enseignantId: teacherUser.enseignant.id,
      promoId: promo2025.id,
      workplan_ar: "تحليل المتطلبات ثم تطوير الواجهة الخلفية والأمامية",
      workplan_en: "Requirements analysis followed by backend and frontend implementation",
      bibliographie_ar: "مراجع في نظم إدارة الشكاوى والمنصات الأكاديمية",
      bibliographie_en: "References on complaint management systems and academic platforms",
      typeProjet: "application",
      status: "valide",
      anneeUniversitaire: "2024-2025",
      maxGrps: 2,
    },
  });

  const sujet2 = await prisma.pfeSujet.create({
    data: {
      titre_ar: "تحليل تنبؤي للمخاطر التأديبية",
      titre_en: "Predictive Analysis of Disciplinary Risks",
      description_ar: "نموذج ذكاء اصطناعي للكشف المبكر عن المخاطر الأكاديمية.",
      description_en: "AI model for early detection of academic risks.",
      keywords_ar: "ذكاء اصطناعي، تنبؤ، مخاطر تأديبية",
      keywords_en: "AI, prediction, disciplinary risks",
      enseignantId: teacher2User.enseignant.id,
      promoId: promo2025B.id,
      workplan_ar: "جمع البيانات، تدريب النموذج، ثم تقييم النتائج",
      workplan_en: "Data collection, model training, then evaluation",
      bibliographie_ar: "مراجع في التحليل التنبؤي والذكاء الاصطناعي التعليمي",
      bibliographie_en: "References on predictive analytics and educational AI",
      typeProjet: "recherche",
      status: "valide",
      anneeUniversitaire: "2024-2025",
      maxGrps: 1,
    },
  });

  const groupA = await prisma.groupPfe.create({
    data: {
      nom_ar: "فريق ISI-A1",
      nom_en: "Group ISI-A1",
      sujetFinalId: sujet1.id,
      coEncadrantId: teacher2User.enseignant.id,
      dateCreation: new Date("2024-10-01"),
      dateAffectation: new Date("2024-10-05"),
    },
  });

  const groupB = await prisma.groupPfe.create({
    data: {
      nom_ar: "فريق ISI-B1",
      nom_en: "Group ISI-B1",
      sujetFinalId: sujet2.id,
      coEncadrantId: teacherUser.enseignant.id,
      dateCreation: new Date("2024-10-01"),
      dateAffectation: new Date("2024-10-06"),
    },
  });

  const ensureGroupMember = async (groupId: number, etudiantId: number, role: "chef_groupe" | "membre") => {
    const existing = await prisma.groupMember.findFirst({
      where: { groupId, etudiantId },
    });
    if (existing) return existing;
    return prisma.groupMember.create({
      data: { groupId, etudiantId, role },
    });
  };

  await ensureGroupMember(groupA.id, studentUser.etudiant.id, "membre");
  await ensureGroupMember(groupA.id, student3User.etudiant.id, "chef_groupe");
  await ensureGroupMember(groupB.id, student2User.etudiant.id, "chef_groupe");

  const ensureJury = async (groupId: number, enseignantId: number, role: "president" | "examinateur" | "rapporteur") => {
    const existing = await prisma.pfeJury.findFirst({
      where: { groupId, enseignantId, role },
    });
    if (existing) return existing;
    return prisma.pfeJury.create({
      data: { groupId, enseignantId, role },
    });
  };

  await ensureJury(groupA.id, teacherUser.enseignant.id, "president");
  await ensureJury(groupA.id, teacher2User.enseignant.id, "examinateur");
  await ensureJury(groupB.id, teacher2User.enseignant.id, "president");
  await ensureJury(groupB.id, teacherUser.enseignant.id, "rapporteur");

  console.log("✅ Direct assignments created:");
  console.log("   • Teachers assigned to promos/modules (enseignements)");
  console.log("   • Students assigned to promo sections A/B");
  console.log("   • PFE groups created with student members and teacher jury/co-encadrant");

  console.log("\n🎉 Seeding complete!\n");
  console.log("────────────────────────────────────────────");
  console.log("  📧 Login credentials (all accounts):");
  console.log("  Password: Test@1234");
  console.log("");
  console.log("  admin@univ-tiaret.dz       (Admin)");
  console.log("  teacher@univ-tiaret.dz     (Enseignant)");
  console.log("  student@univ-tiaret.dz     (Étudiant)");
  console.log("────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
