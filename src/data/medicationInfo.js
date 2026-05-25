// Static medication dictionary — matched case-insensitively against user input.
// keywords: generic name + common brand names to match against
// Each entry: { keywords, name, drugClass, description, uses }

export const MEDICATION_DICTIONARY = [
  // ── Pain / Anti-inflammatory ──────────────────────────────────────────────
  {
    keywords: ['ibuprofen', 'nurofen', 'advil', 'brufen', 'calprofen', 'combiflam'],
    name: 'Ibuprofen',
    drugClass: 'NSAID',
    description: 'A non-steroidal anti-inflammatory drug (NSAID).',
    uses: 'Relieves mild to moderate pain, reduces fever, and treats inflammation. Commonly used for headaches, muscle aches, arthritis, and menstrual cramps.',
    suggestedDosage: '400mg',
  },
  {
    keywords: ['paracetamol', 'acetaminophen', 'tylenol', 'panadol', 'calpol', 'crocin', 'dolo', 'pyrigesic', 'metacin'],
    name: 'Paracetamol',
    drugClass: 'Analgesic / Antipyretic',
    description: 'A widely used over-the-counter painkiller and fever reducer.',
    uses: 'Used for mild to moderate pain relief and to reduce fever. Suitable for headaches, toothache, cold and flu symptoms.',
    suggestedDosage: '500mg or 650mg',
  },
  {
    keywords: ['aspirin', 'disprin', 'aspro', 'ecosprin', 'loprin'],
    name: 'Aspirin',
    drugClass: 'NSAID / Antiplatelet',
    description: 'An NSAID with additional antiplatelet (blood-thinning) properties.',
    uses: 'Used for pain, fever, and inflammation. Low-dose aspirin is prescribed to reduce risk of heart attack and stroke.',
    suggestedDosage: '75mg (cardiac) or 300mg (pain)',
  },
  {
    keywords: ['naproxen', 'aleve', 'naprosyn', 'flanax'],
    name: 'Naproxen',
    drugClass: 'NSAID',
    description: 'A longer-acting NSAID.',
    uses: 'Treats pain and inflammation from arthritis, muscle aches, tendinitis, gout, and menstrual cramps.',
    suggestedDosage: '250mg or 500mg',
  },
  {
    keywords: ['diclofenac', 'voltaren', 'cataflam'],
    name: 'Diclofenac',
    drugClass: 'NSAID',
    description: 'A potent NSAID available as tablets, gel, or injections.',
    uses: 'Used for arthritis, acute pain, and inflammation. Topical gel is commonly applied to joints and muscles.',
    suggestedDosage: '50mg',
  },
  {
    keywords: ['codeine', 'co-codamol'],
    name: 'Codeine',
    drugClass: 'Opioid Analgesic',
    description: 'A mild opioid painkiller, often combined with paracetamol.',
    uses: 'Used for moderate pain not relieved by paracetamol or NSAIDs alone. Also used as a cough suppressant.',
    suggestedDosage: '30mg',
  },
  {
    keywords: ['tramadol', 'ultram', 'tramal'],
    name: 'Tramadol',
    drugClass: 'Opioid Analgesic',
    description: 'A moderate-strength opioid pain reliever.',
    uses: 'Prescribed for moderate to moderately severe pain, including post-surgical and chronic pain conditions.',
    suggestedDosage: '50mg',
  },
  {
    keywords: ['morphine', 'oramorph', 'mst'],
    name: 'Morphine',
    drugClass: 'Opioid Analgesic',
    description: 'A strong opioid used for severe pain management.',
    uses: 'Used for severe acute pain (e.g. post-surgery, injury) and chronic pain in cancer or palliative care.',
    suggestedDosage: '10mg',
  },

  // ── Cardiovascular ────────────────────────────────────────────────────────
  {
    keywords: ['lisinopril', 'zestril', 'prinivil'],
    name: 'Lisinopril',
    drugClass: 'ACE Inhibitor',
    description: 'An ACE inhibitor that relaxes blood vessels.',
    uses: 'Used to treat high blood pressure, heart failure, and to protect the kidneys in diabetes.',
    suggestedDosage: '10mg',
  },
  {
    keywords: ['amlodipine', 'norvasc', 'istin'],
    name: 'Amlodipine',
    drugClass: 'Calcium Channel Blocker',
    description: 'A calcium channel blocker that widens blood vessels.',
    uses: 'Treats high blood pressure and angina (chest pain) by relaxing blood vessels and improving blood flow.',
    suggestedDosage: '5mg',
  },
  {
    keywords: ['atorvastatin', 'lipitor', 'atorva', 'storvas', 'atorlip', 'atocor'],
    name: 'Atorvastatin',
    drugClass: 'Statin',
    description: 'A statin that lowers cholesterol production in the liver.',
    uses: 'Used to lower LDL ("bad") cholesterol and triglycerides, reducing risk of heart attack and stroke.',
    suggestedDosage: '10mg or 20mg',
  },
  {
    keywords: ['simvastatin', 'zocor'],
    name: 'Simvastatin',
    drugClass: 'Statin',
    description: 'A statin medication for cholesterol management.',
    uses: 'Reduces LDL cholesterol and risk of cardiovascular events such as heart attack and stroke.',
    suggestedDosage: '20mg or 40mg',
  },
  {
    keywords: ['rosuvastatin', 'crestor'],
    name: 'Rosuvastatin',
    drugClass: 'Statin',
    description: 'A potent statin for cholesterol reduction.',
    uses: 'Used to lower high cholesterol and triglycerides, and to prevent cardiovascular disease.',
    suggestedDosage: '10mg or 20mg',
  },
  {
    keywords: ['metoprolol', 'lopressor', 'toprol'],
    name: 'Metoprolol',
    drugClass: 'Beta Blocker',
    description: 'A beta blocker that slows heart rate and reduces blood pressure.',
    uses: 'Treats high blood pressure, angina, heart failure, and certain heart rhythm disorders.',
    suggestedDosage: '25mg or 50mg',
  },
  {
    keywords: ['bisoprolol', 'cardicor', 'emcor'],
    name: 'Bisoprolol',
    drugClass: 'Beta Blocker',
    description: 'A cardioselective beta blocker.',
    uses: 'Prescribed for high blood pressure, heart failure, and stable angina.',
    suggestedDosage: '2.5mg or 5mg',
  },
  {
    keywords: ['ramipril', 'altace', 'tritace'],
    name: 'Ramipril',
    drugClass: 'ACE Inhibitor',
    description: 'An ACE inhibitor that lowers blood pressure.',
    uses: 'Used for high blood pressure, heart failure, and to reduce risk of heart attack and stroke.',
    suggestedDosage: '5mg',
  },
  {
    keywords: ['warfarin', 'coumadin', 'marevan'],
    name: 'Warfarin',
    drugClass: 'Anticoagulant',
    description: 'A blood thinner that prevents clot formation.',
    uses: 'Used to prevent and treat blood clots, including deep vein thrombosis, pulmonary embolism, and stroke risk in atrial fibrillation.',
    suggestedDosage: '2mg or 5mg',
  },
  {
    keywords: ['apixaban', 'eliquis'],
    name: 'Apixaban',
    drugClass: 'Anticoagulant (DOAC)',
    description: 'A direct oral anticoagulant (blood thinner).',
    uses: 'Prevents strokes and blood clots in atrial fibrillation, and treats/prevents DVT and pulmonary embolism.',
    suggestedDosage: '5mg',
  },
  {
    keywords: ['rivaroxaban', 'xarelto'],
    name: 'Rivaroxaban',
    drugClass: 'Anticoagulant (DOAC)',
    description: 'A direct oral anticoagulant.',
    uses: 'Used for stroke prevention in atrial fibrillation, and treatment of DVT and pulmonary embolism.',
    suggestedDosage: '20mg',
  },
  {
    keywords: ['furosemide', 'lasix', 'frusemide'],
    name: 'Furosemide',
    drugClass: 'Loop Diuretic',
    description: 'A powerful diuretic ("water pill") that increases urine output.',
    uses: 'Used to treat fluid retention (oedema) associated with heart failure, liver disease, and kidney disease.',
    suggestedDosage: '40mg',
  },

  // ── Diabetes ──────────────────────────────────────────────────────────────
  {
    keywords: ['metformin', 'glucophage', 'glumetza', 'glycomet', 'obimet', 'gluconorm'],
    name: 'Metformin',
    drugClass: 'Biguanide',
    description: 'The first-line oral medication for type 2 diabetes.',
    uses: 'Lowers blood sugar by reducing glucose production in the liver and improving insulin sensitivity.',
    suggestedDosage: '500mg or 1000mg',
  },
  {
    keywords: ['insulin', 'novorapid', 'humalog', 'lantus', 'levemir', 'glargine'],
    name: 'Insulin',
    drugClass: 'Hormone / Antidiabetic',
    description: 'A hormone that regulates blood sugar levels.',
    uses: 'Essential for type 1 diabetes; also used in type 2 diabetes when oral medications are insufficient.',
    suggestedDosage: 'As prescribed (units)',
  },
  {
    keywords: ['sitagliptin', 'januvia'],
    name: 'Sitagliptin',
    drugClass: 'DPP-4 Inhibitor',
    description: 'An oral diabetes medication that works by increasing insulin release.',
    uses: 'Used alongside diet and exercise to improve blood sugar control in type 2 diabetes.',
    suggestedDosage: '100mg',
  },
  {
    keywords: ['empagliflozin', 'jardiance'],
    name: 'Empagliflozin',
    drugClass: 'SGLT-2 Inhibitor',
    description: 'Lowers blood sugar by causing the kidneys to remove glucose via urine.',
    uses: 'Treats type 2 diabetes and has proven benefits for heart failure and chronic kidney disease.',
    suggestedDosage: '10mg or 25mg',
  },

  // ── Respiratory ───────────────────────────────────────────────────────────
  {
    keywords: ['salbutamol', 'albuterol', 'ventolin', 'proventil'],
    name: 'Salbutamol',
    drugClass: 'Short-acting Beta-2 Agonist (SABA)',
    description: 'A fast-acting bronchodilator inhaler ("reliever inhaler").',
    uses: 'Provides quick relief from asthma symptoms and exercise-induced bronchospasm by relaxing airway muscles.',
  },
  {
    keywords: ['fluticasone', 'flixotide', 'flovent', 'flonase'],
    name: 'Fluticasone',
    drugClass: 'Inhaled Corticosteroid',
    description: 'A steroid inhaler that reduces airway inflammation.',
    uses: 'Used as a preventer inhaler for asthma and to reduce symptoms of allergic rhinitis.',
  },
  {
    keywords: ['budesonide', 'pulmicort', 'rhinocort', 'symbicort'],
    name: 'Budesonide',
    drugClass: 'Inhaled Corticosteroid',
    description: 'An anti-inflammatory corticosteroid for the airways.',
    uses: 'Prevents asthma attacks and treats allergic rhinitis, nasal polyps, and inflammatory bowel disease.',
  },
  {
    keywords: ['montelukast', 'singulair', 'montus', 'montair', 'montemac', 'romilast'],
    name: 'Montelukast',
    drugClass: 'Leukotriene Receptor Antagonist',
    description: 'An oral tablet that reduces airway inflammation.',
    uses: 'Used to prevent asthma symptoms and treat seasonal allergies (hay fever).',
  },
  {
    keywords: ['l montus', 'lmontus', 'l montair', 'lmontair', 'levocet m', 'lcz m', 'levocetirizine montelukast', 'xyzal m'],
    name: 'Levocetirizine + Montelukast',
    drugClass: 'Antihistamine + Leukotriene Antagonist',
    description: 'A combination of levocetirizine (antihistamine) and montelukast (leukotriene blocker).',
    uses: 'Treats allergic rhinitis, chronic urticaria, and asthma with allergic component. Common in paediatric formulations (Kid/Junior).',
  },

  // ── Mental Health ─────────────────────────────────────────────────────────
  {
    keywords: ['sertraline', 'zoloft', 'lustral'],
    name: 'Sertraline',
    drugClass: 'SSRI Antidepressant',
    description: 'A selective serotonin reuptake inhibitor (SSRI).',
    uses: 'Treats depression, anxiety disorders, OCD, PTSD, and panic disorder.',
  },
  {
    keywords: ['fluoxetine', 'prozac', 'oxactin'],
    name: 'Fluoxetine',
    drugClass: 'SSRI Antidepressant',
    description: 'One of the most widely prescribed SSRIs.',
    uses: 'Used for depression, OCD, bulimia nervosa, panic disorder, and premenstrual dysphoric disorder.',
  },
  {
    keywords: ['escitalopram', 'lexapro', 'cipralex'],
    name: 'Escitalopram',
    drugClass: 'SSRI Antidepressant',
    description: 'A highly selective SSRI antidepressant.',
    uses: 'Treats depression and generalised anxiety disorder (GAD).',
  },
  {
    keywords: ['citalopram', 'celexa', 'cipramil'],
    name: 'Citalopram',
    drugClass: 'SSRI Antidepressant',
    description: 'An SSRI antidepressant.',
    uses: 'Used to treat depression and anxiety disorders.',
  },
  {
    keywords: ['venlafaxine', 'effexor', 'venlalic'],
    name: 'Venlafaxine',
    drugClass: 'SNRI Antidepressant',
    description: 'A serotonin-norepinephrine reuptake inhibitor (SNRI).',
    uses: 'Treats depression, generalised anxiety, social anxiety disorder, and panic disorder.',
  },
  {
    keywords: ['amitriptyline', 'elavil', 'tryptizol'],
    name: 'Amitriptyline',
    drugClass: 'Tricyclic Antidepressant',
    description: 'A tricyclic antidepressant also used for pain and sleep.',
    uses: 'Treats depression, nerve pain, migraines, and insomnia at low doses.',
  },
  {
    keywords: ['mirtazapine', 'remeron', 'zispin'],
    name: 'Mirtazapine',
    drugClass: 'NaSSA Antidepressant',
    description: 'An antidepressant that also improves sleep and appetite.',
    uses: 'Used for depression, particularly when sleep disturbance or poor appetite are concerns.',
  },
  {
    keywords: ['quetiapine', 'seroquel'],
    name: 'Quetiapine',
    drugClass: 'Atypical Antipsychotic',
    description: 'An atypical antipsychotic used for several mental health conditions.',
    uses: 'Treats schizophrenia, bipolar disorder, and as an add-on for treatment-resistant depression.',
  },
  {
    keywords: ['diazepam', 'valium'],
    name: 'Diazepam',
    drugClass: 'Benzodiazepine',
    description: 'A benzodiazepine with calming and muscle-relaxant effects.',
    uses: 'Short-term treatment of anxiety, muscle spasms, alcohol withdrawal, and seizures.',
  },
  {
    keywords: ['lorazepam', 'ativan'],
    name: 'Lorazepam',
    drugClass: 'Benzodiazepine',
    description: 'A short-acting benzodiazepine.',
    uses: 'Used for anxiety, pre-procedural sedation, and acute seizure management.',
  },

  // ── Neurology ─────────────────────────────────────────────────────────────
  {
    keywords: ['gabapentin', 'neurontin'],
    name: 'Gabapentin',
    drugClass: 'Anticonvulsant / Neuropathic Agent',
    description: 'Originally an anti-epileptic, now widely used for nerve pain.',
    uses: 'Treats nerve pain (neuropathy), epilepsy, and restless leg syndrome.',
  },
  {
    keywords: ['pregabalin', 'lyrica'],
    name: 'Pregabalin',
    drugClass: 'Anticonvulsant / Neuropathic Agent',
    description: 'Related to gabapentin, used for nerve pain and anxiety.',
    uses: 'Treats neuropathic pain, fibromyalgia, epilepsy, and generalised anxiety disorder.',
  },
  {
    keywords: ['topiramate', 'topamax'],
    name: 'Topiramate',
    drugClass: 'Anticonvulsant',
    description: 'An anticonvulsant used for epilepsy and migraine prevention.',
    uses: 'Prevents epileptic seizures and reduces frequency of migraines.',
  },
  {
    keywords: ['sumatriptan', 'imigran', 'imitrex'],
    name: 'Sumatriptan',
    drugClass: 'Triptan',
    description: 'A triptan that targets serotonin receptors to abort migraines.',
    uses: 'Used to treat acute migraine attacks and cluster headaches.',
  },

  // ── GI / Gastro ───────────────────────────────────────────────────────────
  {
    keywords: ['omeprazole', 'losec', 'prilosec'],
    name: 'Omeprazole',
    drugClass: 'Proton Pump Inhibitor (PPI)',
    description: 'A proton pump inhibitor that reduces stomach acid production.',
    uses: 'Treats acid reflux (GERD), stomach ulcers, and protects the stomach lining when taking NSAIDs.',
  },
  {
    keywords: ['lansoprazole', 'prevacid', 'zoton'],
    name: 'Lansoprazole',
    drugClass: 'Proton Pump Inhibitor (PPI)',
    description: 'A PPI that reduces gastric acid secretion.',
    uses: 'Used for acid reflux, peptic ulcers, and H. pylori eradication.',
  },
  {
    keywords: ['pantoprazole', 'protonix', 'pantoloc'],
    name: 'Pantoprazole',
    drugClass: 'Proton Pump Inhibitor (PPI)',
    description: 'A PPI for reducing stomach acid.',
    uses: 'Treats GERD, erosive esophagitis, and Zollinger-Ellison syndrome.',
  },
  {
    keywords: ['ranitidine', 'zantac'],
    name: 'Ranitidine',
    drugClass: 'H2 Blocker',
    description: 'An H2 receptor antagonist that reduces acid production.',
    uses: 'Treats heartburn, acid indigestion, and peptic ulcers.',
  },
  {
    keywords: ['ondansetron', 'zofran'],
    name: 'Ondansetron',
    drugClass: 'Antiemetic',
    description: 'Blocks serotonin receptors to prevent nausea and vomiting.',
    uses: 'Used to prevent nausea and vomiting caused by chemotherapy, surgery, or severe morning sickness.',
  },

  // ── Thyroid ───────────────────────────────────────────────────────────────
  {
    keywords: ['levothyroxine', 'synthroid', 'eltroxin', 'thyronorm', 'thyrox'],
    name: 'Levothyroxine',
    drugClass: 'Thyroid Hormone',
    description: 'A synthetic form of the thyroid hormone T4.',
    uses: 'Replaces or supplements thyroid hormone in hypothyroidism (underactive thyroid).',
  },

  // ── Antibiotics ───────────────────────────────────────────────────────────
  {
    keywords: ['amoxicillin', 'amoxil', 'trimox'],
    name: 'Amoxicillin',
    drugClass: 'Penicillin Antibiotic',
    description: 'A broad-spectrum penicillin antibiotic.',
    uses: 'Treats bacterial infections including ear, throat, chest, urine, and skin infections.',
  },
  {
    keywords: ['azithromycin', 'zithromax', 'z-pack', 'azithral', 'azee', 'zithrocin'],
    name: 'Azithromycin',
    drugClass: 'Macrolide Antibiotic',
    description: 'A macrolide antibiotic with a long duration of action.',
    uses: 'Treats respiratory infections, skin infections, and sexually transmitted infections.',
  },
  {
    keywords: ['doxycycline', 'vibramycin', 'oracea'],
    name: 'Doxycycline',
    drugClass: 'Tetracycline Antibiotic',
    description: 'A broad-spectrum tetracycline antibiotic.',
    uses: 'Treats acne, chest infections, malaria prevention, and Lyme disease.',
  },
  {
    keywords: ['trimethoprim', 'primsol'],
    name: 'Trimethoprim',
    drugClass: 'Antibiotic',
    description: 'An antibiotic targeting urinary tract bacteria.',
    uses: 'Used primarily to treat and prevent urinary tract infections (UTIs).',
  },
  {
    keywords: ['flucloxacillin', 'floxapen'],
    name: 'Flucloxacillin',
    drugClass: 'Penicillin Antibiotic',
    description: 'A penicillin antibiotic effective against staphylococcal infections.',
    uses: 'Treats skin and soft tissue infections such as cellulitis and impetigo.',
  },

  // ── Allergy / Antihistamine ───────────────────────────────────────────────
  {
    keywords: ['cetirizine', 'zyrtec', 'reactine', 'piriteze', 'okacet', 'cetcip', 'alerid'],
    name: 'Cetirizine',
    drugClass: 'Antihistamine',
    description: 'A non-drowsy second-generation antihistamine.',
    uses: 'Treats hay fever, allergic rhinitis, hives, and other allergic reactions.',
  },
  {
    keywords: ['loratadine', 'claritin', 'clarityn'],
    name: 'Loratadine',
    drugClass: 'Antihistamine',
    description: 'A non-sedating oral antihistamine.',
    uses: 'Relieves allergy symptoms including sneezing, itchy eyes, and hives.',
  },
  {
    keywords: ['fexofenadine', 'allegra', 'telfast'],
    name: 'Fexofenadine',
    drugClass: 'Antihistamine',
    description: 'A non-drowsy antihistamine for allergy relief.',
    uses: 'Treats seasonal allergies and chronic hives (urticaria).',
  },

  // ── Bone / Joint ─────────────────────────────────────────────────────────
  {
    keywords: ['alendronate', 'fosamax', 'binosto'],
    name: 'Alendronate',
    drugClass: 'Bisphosphonate',
    description: 'A bisphosphonate that strengthens bones.',
    uses: 'Treats and prevents osteoporosis by slowing bone loss.',
  },

  // ── Contraception / Hormones ─────────────────────────────────────────────
  {
    keywords: ['combined pill', 'microgynon', 'rigevidon', 'cilest'],
    name: 'Combined Oral Contraceptive',
    drugClass: 'Hormonal Contraceptive',
    description: 'Contains oestrogen and progestogen to prevent pregnancy.',
    uses: 'Used for contraception and may also regulate periods and treat acne.',
  },

  // ── Urological ────────────────────────────────────────────────────────────
  {
    keywords: ['tamsulosin', 'flomax', 'flomaxtra', 'urimax'],
    name: 'Tamsulosin',
    drugClass: 'Alpha Blocker',
    description: 'Relaxes muscles in the prostate and bladder neck.',
    uses: 'Treats symptoms of benign prostatic hyperplasia (BPH) such as difficulty urinating.',
  },

  // ── Levocetirizine ────────────────────────────────────────────────────────
  {
    keywords: ['levocetirizine', 'xyzal', 'levocet', 'lcz', 'levorid', 'vozet'],
    name: 'Levocetirizine',
    drugClass: 'Antihistamine',
    description: 'A potent second-generation antihistamine.',
    uses: 'Treats allergic rhinitis, chronic urticaria, and other allergic conditions. Often combined with montelukast.',
  },

  // ── Combination / Indian market ────────────────────────────────────────────
  {
    keywords: ['augmentin', 'amoxyclav', 'clavam', 'co-amoxiclav'],
    name: 'Amoxicillin + Clavulanate',
    drugClass: 'Penicillin Antibiotic (Extended)',
    description: 'A combination antibiotic with added beta-lactamase inhibitor.',
    uses: 'Treats resistant bacterial infections including sinusitis, ear infections, UTIs, and skin infections.',
  },
  {
    keywords: ['telmisartan', 'telma', 'telmikind', 'telsartan', 'micardis'],
    name: 'Telmisartan',
    drugClass: 'ARB (Angiotensin Receptor Blocker)',
    description: 'Blocks angiotensin receptors to lower blood pressure.',
    uses: 'Treats high blood pressure and reduces risk of cardiovascular events.',
  },
  {
    keywords: ['losartan', 'cozaar', 'losacar', 'repace'],
    name: 'Losartan',
    drugClass: 'ARB (Angiotensin Receptor Blocker)',
    description: 'An ARB that relaxes blood vessels.',
    uses: 'Treats high blood pressure, diabetic kidney disease, and heart failure.',
  },
  {
    keywords: ['vildagliptin', 'galvus', 'zomelis'],
    name: 'Vildagliptin',
    drugClass: 'DPP-4 Inhibitor',
    description: 'An oral diabetes medication that stimulates insulin release.',
    uses: 'Improves blood sugar control in type 2 diabetes, often used with metformin.',
  },
  {
    keywords: ['glimepiride', 'amaryl', 'glimisave', 'zoryl'],
    name: 'Glimepiride',
    drugClass: 'Sulfonylurea',
    description: 'Stimulates the pancreas to produce more insulin.',
    uses: 'Treats type 2 diabetes to lower blood sugar levels.',
  },
  {
    keywords: ['pantop', 'pan 40', 'pantodac', 'pantocid'],
    name: 'Pantoprazole',
    drugClass: 'Proton Pump Inhibitor (PPI)',
    description: 'A PPI for reducing stomach acid.',
    uses: 'Treats acidity, GERD, gastric ulcers, and acid-related stomach disorders.',
  },
  {
    keywords: ['rabeprazole', 'razo', 'rablet', 'rekool'],
    name: 'Rabeprazole',
    drugClass: 'Proton Pump Inhibitor (PPI)',
    description: 'A PPI for acid suppression.',
    uses: 'Treats GERD, peptic ulcers, and H. pylori infections.',
  },
  {
    keywords: ['domperidone', 'domstal', 'vomistop', 'motilium'],
    name: 'Domperidone',
    drugClass: 'Antiemetic / Prokinetic',
    description: 'Speeds up stomach emptying and reduces nausea.',
    uses: 'Treats nausea, vomiting, and gastroparesis. Often prescribed with PPIs for reflux.',
  },
  {
    keywords: ['deflazacort', 'defcort', 'dezacor'],
    name: 'Deflazacort',
    drugClass: 'Corticosteroid',
    description: 'A corticosteroid with anti-inflammatory and immunosuppressant properties.',
    uses: 'Treats inflammatory and autoimmune conditions, including asthma, allergies, and rheumatic diseases.',
  },
  {
    keywords: ['methylprednisolone', 'medrol', 'solumedrol', 'methy'],
    name: 'Methylprednisolone',
    drugClass: 'Corticosteroid',
    description: 'A potent corticosteroid for inflammation.',
    uses: 'Treats severe allergic reactions, asthma attacks, autoimmune conditions, and inflammation.',
  },
  {
    keywords: ['prednisolone', 'wysolone', 'omnacortil', 'deltacortril'],
    name: 'Prednisolone',
    drugClass: 'Corticosteroid',
    description: 'An oral corticosteroid for inflammatory and immune conditions.',
    uses: 'Treats asthma, allergies, inflammatory bowel disease, and autoimmune conditions.',
  },
  {
    keywords: ['vitamin d', 'cholecalciferol', 'd3', 'calcirol', 'uprise', 'drise'],
    name: 'Vitamin D3 (Cholecalciferol)',
    drugClass: 'Vitamin / Supplement',
    description: 'A fat-soluble vitamin essential for bone health and immunity.',
    uses: 'Treats and prevents vitamin D deficiency. Supports calcium absorption and bone health.',
  },
  {
    keywords: ['calcium', 'calciquid', 'shelcal', 'calcimax', 'calcium carbonate'],
    name: 'Calcium',
    drugClass: 'Mineral Supplement',
    description: 'Essential mineral for bone, muscle, and nerve function.',
    uses: 'Prevents and treats calcium deficiency, osteoporosis, and hypocalcaemia.',
  },
]

/**
 * Find a medication in the static dictionary.
 * Returns the entry or null if not found.
 */
export function findMedication(name) {
  if (!name || name.trim().length < 2) return null
  const q = name.trim().toLowerCase()
  return MEDICATION_DICTIONARY.find(entry =>
    entry.keywords.some(k => q.includes(k) || k.includes(q))
  ) || null
}
