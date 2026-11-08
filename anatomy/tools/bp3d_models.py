#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and AnatomyBook contributors. MIT (see ../LICENSE-MIT).
"""BodyParts3D OBJ -> assets/3d/*.glb (AnatomyBook 3D 해부 모델 생성기).

필요: pip install trimesh fast-simplification, npm i -g @gltf-transform/cli
실행: python3 tools/bp3d_models.py <bp3d> <임시폴더> [모델 ...]
      그다음 모델마다
      gltf-transform weld <임시폴더>/<모델>.raw.glb w.glb && gltf-transform quantize w.glb assets/3d/<모델>.glb
모델 하나는 그룹(부위)의 목록이다. 그룹 하나가 이름 붙은 재질 하나를 가진 메시 하나가 되고,
장의 3D 뷰어(js/anatomy3d.js)는 이 재질 이름(key)으로 부위를 켜고 끄거나 반투명하게 한다. 먼저 맞는 그룹이 요소를 가져간다.
그룹 key와 한국어 이름은 CONTRIBUTING.md의 "3D 모델 목록"에 있다.
"""
import os, sys
import numpy as np
import trimesh
import fast_simplification
import bp3d

ARTERY, VEIN, BONE, NERVE = "#d4423a", "#3d63c4", "#ece3cf", "#f0d690"
MUSCLE = "#b54a3f"
# 골격근 전체: FMA에서 근육은 세 갈래로 흩어져 있다. 근육 기관(FMA5022), 근육 기관의 구역(FMA10474: 넙다리네갈래근의 네 갈래,
# 어깨세모근·큰가슴근의 부분 등), 기관의 갈래(FMA45729: 위팔두갈래근·장딴지근·넙다리두갈래근의 갈래 등). 등세모근의 부분 일부는 따로 맞춘다.
MUSCLES = ["FMA5022", "FMA10474", "FMA45729", r"part of (left |right )?trapezius$"]
BONES = ["FMA23876", r"^(Left|Right) (femur|tibia|fibula|humerus|radius|ulna|patella|calcaneus|talus|navicular|cuboid|(medial|intermediate|lateral) cuneiform|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|\w+ meta(carpal|tarsal) bone)$", r"^(Proximal|Middle|Distal) phalanx of (left|right) "]
NOT_BONE = [r"choroid|cornea|iris$|lens$|sclera|vitreous|lacrimal gland|chamber of|Suspensory"]
RIGHT = [(-500, -400, -200), (-2, 400, 1800)]          # 몸의 오른쪽 절반(원본 -x)
FINGER = r"phalanx of (left |right )?(thumb|index finger|middle finger|ring finger|little finger)$"
TOE = r"phalanx of (left |right )?(big toe|second toe|third toe|fourth toe|little toe)$"
CARPAL = r"^(Left|Right) (scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate)$"
TARSAL = r"^(Left|Right) (talus|calcaneus|cuboid bone|(medial|intermediate|lateral) cuneiform bone)$|^Navicular bone of (left|right) foot$"
M = lambda key, sel, color, faces, **kw: dict(key=key, sel=sel, color=color, faces=faces, rough=0.45, **kw)

MODELS = {
    # 01 해부학의 언어: 몸 전체를 계통별로
    "systems": dict(groups=[
        dict(key="brain", sel=["FMA50801"], color="#e6b8a8", faces=5000),
        dict(key="organs", sel=[r"^Wall of (ventricle|right atrium|left atrium)$", "FMA7309&bronch", "FMA7310&bronch", "FMA7393", "FMA7148", "FMA7200", "FMA7201", r"^(Right|Left) kidney$", r"^Urinary bladder$", r"^Spleen$", r"^Pancreas$"], color="#d98a7a", faces=12000),
        dict(key="liver", sel=["FMA7197"], exclude=[r"artery|vein|duct"], color="#8f3b32", faces=3000),
        dict(key="arteries", sel=["FMA45623", r"^(Ascending aorta|Arch of aorta)$"], exclude=[r"coronary|pulmonary|segmental artery"], color=ARTERY, faces=14000),
        dict(key="skeleton", sel=BONES, exclude=NOT_BONE, color=BONE, faces=30000),
        M("muscles", MUSCLES, MUSCLE, 40000),
        dict(key="skin", sel=[r"^Skin$"], color="#d9b49a", alpha=0.16, faces=14000),
    ]),
    # 02 뼈대: 부위별 뼈
    "skeleton": dict(groups=[
        dict(key="skull", sel=["FMA46565", r"^Mandible$", r"^Hyoid bone$"], exclude=NOT_BONE + [r"tooth"], color="#e9d8b4", faces=14000),
        dict(key="discs", sel=[r"^Intervertebral disk"], color="#9cc3e0", faces=3000),
        dict(key="spine", sel=["FMA13478", r"^Sacrum$"], exclude=[r"disk"], color="#d9c08a", faces=10000),
        dict(key="thorax", sel=["FMA7480", r"costal cartilage$|^Manubrium$|^Body of sternum$|^Xiphoid process$"], color="#e6cf9c", faces=10000),
        dict(key="shoulder", sel=[r"^(Left|Right) (clavicle|scapula)$"], color="#c7d99a", faces=3000),
        dict(key="arm", sel=[r"^(Left|Right) (humerus|radius|ulna)$"], color="#a9d1a0", faces=4000),
        dict(key="hand", sel=[CARPAL, r"metacarpal bone$", FINGER], color="#8fc9b8", faces=6000),
        dict(key="pelvis", sel=[r"^(Left|Right) hip bone$"], color="#e0b48a", faces=4000),
        dict(key="leg", sel=[r"^(Left|Right) (femur|patella|tibia|fibula)$"], color="#d9a98f", faces=5000),
        dict(key="foot", sel=[TARSAL, r"metatarsal bone$", TOE, r"Sesamoid bone of"], color="#cf9a9a", faces=6000),
        dict(key="skin", sel=[r"^Skin$"], color="#d9b49a", alpha=0.08, faces=10000),
    ]),
    # 03 머리뼈
    "skull": dict(groups=[
        dict(key="frontal", sel=[r"^Frontal bone$"], color="#e8c27a", faces=5000),
        dict(key="parietal", sel=[r"^(Left|Right) parietal bone$"], color="#8fbfe0", faces=5000),
        dict(key="temporal", sel=[r"^(Left|Right) temporal bone$"], color="#9fcf8f", faces=6000),
        dict(key="occipital", sel=[r"^Occipital bone$"], color="#c9a0dc", faces=4000),
        dict(key="sphenoid", sel=[r"^Sphenoid bone$"], color="#f09a7a", faces=5000),
        dict(key="ethmoid", sel=[r"^Ethmoid$"], color="#f2d06b", faces=2500),
        dict(key="zygomatic", sel=[r"zygomatic bone$"], color="#7fd1c7", faces=1500),
        dict(key="maxilla", sel=[r"maxilla$"], color="#e8a0b8", faces=4000),
        dict(key="facial", sel=[r"(nasal bone|lacrimal bone|palatine bone|inferior nasal concha)$|^Vomer$"], color="#b8b0e8", faces=2500),
        dict(key="mandible", sel=[r"^Mandible$"], color="#e6b07a", faces=4000),
        dict(key="teeth", sel=["FMA12516"], color="#fbf7ee", faces=5000),
        dict(key="hyoid", sel=[r"^Hyoid bone$"], color="#d0c0a0", faces=800),
    ]),
    # 03 척주
    "spine": dict(groups=[
        dict(key="discs", sel=[r"^Intervertebral disk"], color="#7fb6e0", faces=5000),
        dict(key="cervical", sel=["FMA9915", r"^Atlas$|^Axis$"], color="#f0b27a", faces=7000),
        dict(key="thoracic", sel=["FMA9139"], color="#e6d08a", faces=9000),
        dict(key="lumbar", sel=["FMA9921"], color="#9fd08f", faces=6000),
        dict(key="sacrum", sel=[r"^Sacrum$"], color="#c9a0dc", faces=3000),
        dict(key="spinalcord", sel=["FMA7647"], color=NERVE, faces=4000),  # 원본의 척수는 중심관 모양만 있다
        dict(key="ribs", sel=["FMA7480"], color=BONE, alpha=0.2, faces=8000),
        dict(key="pelvis", sel=[r"^(Left|Right) hip bone$"], color=BONE, alpha=0.2, faces=3000),
        dict(key="skull", sel=["FMA46565"], exclude=NOT_BONE + [r"tooth"], color=BONE, alpha=0.2, faces=5000),
    ]),
    # 03 가슴우리
    "ribcage": dict(groups=[
        dict(key="floating", sel=["FMA7595"], color="#9fd08f", faces=2000),
        dict(key="falserib", sel=["FMA7594"], color="#8fbfe0", faces=5000),
        dict(key="truerib", sel=["FMA7592"], color="#f0b27a", faces=9000),
        dict(key="costal", sel=[r"costal cartilage$"], color="#a8d8f0", faces=4000),
        dict(key="sternum", sel=[r"^Manubrium$|^Body of sternum$|^Xiphoid process$"], color="#e8a0b8", faces=2500),
        dict(key="tspine", sel=["FMA9139"], color="#e6d08a", faces=6000),
        dict(key="girdle", sel=[r"^(Left|Right) (clavicle|scapula)$"], color=BONE, alpha=0.3, faces=3000),
        dict(key="diaphragm", sel=[r"^Diaphragm$"], color="#c7705c", alpha=0.35, faces=5000),
    ]),
    # 04 팔(오른쪽)
    "upperlimb": dict(groups=[
        M("deltoid", [r"part of (left |right )?deltoid$"], "#d0563f", 6000),
        M("cuff", [r"supraspinatus$|infraspinatus muscle$|teres minor$|subscapularis$"], "#e0a040", 6000),
        M("pectoral", [r"part of (left |right )?pectoralis major$|pectoralis minor$|subclavius$"], "#c9784a", 5000),
        M("armflex", [r"biceps brachii$|brachialis$|coracobrachialis$"], "#9c3b6a", 5000),
        M("armext", [r"triceps brachii$|anconeus$"], "#8f6fb8", 5000),
        M("forearmflex", [r"flexor carpi (radialis|ulnaris)$|flexor digitorum (superficialis|profundus)$|flexor pollicis longus$|palmaris longus$|pronator (teres|quadratus)$|flexor retinaculum"], "#3f8fb0", 7000),
        M("forearmext", [r"extensor carpi|extensor digitorum$|extensor digiti minimi$|extensor indicis$|extensor pollicis|abductor pollicis longus$|brachioradialis$|supinator$"], "#4caf7a", 7000),
        M("handm", [r"lumbricals of (left |right )?hand|interossei of (left |right )?hand|abductor pollicis brevis$|flexor pollicis brevis$|opponens pollicis$|adductor pollicis$|digiti minimi of (left |right )?hand$"], "#c9a23f", 4000),
        M("back", [r"teres major$|part of (left |right )?trapezius$|rhomboid (major|minor)$|levator scapulae$|serratus anterior$"], "#b0864a", 6000, alpha=0.6),
        dict(key="bones", sel=[r"^(Left|Right) (clavicle|scapula|humerus|radius|ulna)$", CARPAL, r"metacarpal bone$", FINGER], color=BONE, faces=9000),
    ], box=RIGHT),
    # 05 다리(오른쪽)
    "lowerlimb": dict(groups=[
        M("glutes", [r"gluteus (maximus|medius|minimus)$"], "#c9784a", 6000),
        M("deepglute", [r"piriformis$|gemellus (superior|inferior)$|obturator (internus|externus)$|quadratus femoris$"], "#e0a040", 3000),
        M("iliopsoas", [r"psoas major$|iliacus$"], "#b0864a", 3000),
        M("quads", [r"rectus femoris$|vastus (lateralis|medialis|intermedius)$"], "#d0563f", 7000),
        M("hamstrings", [r"biceps femoris$|semitendinosus$|semimembranosus$"], "#9c3b6a", 5000),
        M("adductors", [r"adductor (longus|brevis|magnus|minimus)$|gracilis$|pectineus$"], "#8f6fb8", 6000),
        M("sartorius", [r"sartorius$|tensor fasciae latae$|iliotibial tract$"], "#d98fb0", 3000),
        M("calf", [r"gastrocnemius$|soleus$|plantaris$|calcaneal tendon$"], "#3f8fb0", 5000),
        M("deepcalf", [r"tibialis posterior$|flexor digitorum longus$|flexor hallucis longus$|popliteus$"], "#5fb0d0", 3000),
        M("shin", [r"tibialis anterior$|extensor (digitorum|hallucis) longus$|fibularis tertius$"], "#4caf7a", 3000),
        M("fibular", [r"fibularis (longus|brevis)$"], "#9fcf5f", 2000),
        M("footm", [r"abductor hallucis$|flexor digitorum brevis$|flexor accessorius$|lumbrical of (left |right )?foot$|interosseous of (left |right )?foot$|hallucis brevis$|adductor hallucis$|digiti minimi (brevis )?of (left |right )?foot$|extensor (digitorum|hallucis) brevis$"], "#c9a23f", 3000),
        dict(key="bones", sel=[r"^(Left|Right) (hip bone|femur|patella|tibia|fibula)$", TARSAL, r"metatarsal bone$", TOE, r"^Sacrum$"], color=BONE, faces=9000),
    ], box=RIGHT),
    # 04·06 손(오른쪽): 뼈 하나하나
    "hand": dict(groups=[
        dict(key="scaphoid", sel=[r"^Right scaphoid$"], color="#f0b27a", faces=800),
        dict(key="lunate", sel=[r"^Right lunate$"], color="#9fd08f", faces=800),
        dict(key="triquetral", sel=[r"^Right triquetral$"], color="#8fbfe0", faces=800),
        dict(key="pisiform", sel=[r"^Right pisiform$"], color="#c9a0dc", faces=500),
        dict(key="trapezium", sel=[r"^Right trapezium$"], color="#f2d06b", faces=800),
        dict(key="trapezoid", sel=[r"^Right trapezoid$"], color="#e8a0b8", faces=800),
        dict(key="capitate", sel=[r"^Right capitate$"], color="#7fd1c7", faces=800),
        dict(key="hamate", sel=[r"^Right hamate$"], color="#e07a6a", faces=800),
        dict(key="metacarpals", sel=[r"^Right \w+ metacarpal bone$"], color="#e9dcc0", faces=4000),
        dict(key="proximal", sel=[r"^Proximal phalanx of right (thumb|index finger|middle finger|ring finger|little finger)$"], color="#d9c8a0", faces=3000),
        dict(key="middle", sel=[r"^Middle phalanx of right (index finger|middle finger|ring finger|little finger)$"], color="#cdb98f", faces=2000),
        dict(key="distal", sel=[r"^Distal phalanx of right (thumb|index finger|middle finger|ring finger|little finger)$"], color="#c0aa80", faces=2000),
        dict(key="forearm", sel=[r"^Right (radius|ulna)$"], color=BONE, alpha=0.6, faces=2500, clip=[(-500, -400, 790), (0, 400, 900)]),
    ]),
    # 05·06 발(오른쪽)
    "foot": dict(groups=[
        dict(key="talus", sel=[r"^Right talus$"], color="#f0b27a", faces=1500),
        dict(key="calcaneus", sel=[r"^Right calcaneus$"], color="#9fd08f", faces=1800),
        dict(key="navicular", sel=[r"^Navicular bone of right foot$"], color="#8fbfe0", faces=800),
        dict(key="cuboid", sel=[r"^Right cuboid bone$"], color="#c9a0dc", faces=800),
        dict(key="cuneiforms", sel=[r"^Right (medial|intermediate|lateral) cuneiform bone$"], color="#f2d06b", faces=1500),
        dict(key="metatarsals", sel=[r"^Right \w+ metatarsal bone$"], color="#e9dcc0", faces=4000),
        dict(key="phalanges", sel=[r"phalanx of right (big toe|second toe|third toe|fourth toe|little toe)$", r"Sesamoid bone of right foot"], color="#d9c8a0", faces=4000),
        dict(key="tendon", sel=[r"^Right calcaneal tendon$", r"^Right long plantar ligament$"], color="#f4f0e0", faces=1500),
        dict(key="leg", sel=[r"^Right (tibia|fibula)$"], color=BONE, alpha=0.6, faces=2000, clip=[(-500, -400, -200), (0, 400, 120)]),
    ]),
    # 06 어깨관절(오른쪽)
    "shoulder": dict(groups=[
        M("supraspinatus", [r"^Right supraspinatus$"], "#e0a040", 2000),
        M("infraspinatus", [r"^Right infraspinatus muscle$"], "#d07a30", 2000),
        M("teresminor", [r"^Right teres minor$"], "#c9a23f", 1000),
        M("subscapularis", [r"^Right subscapularis$"], "#e6c04f", 2000),
        M("deltoid", [r"part of right deltoid$"], "#d0563f", 4000, alpha=0.55),
        M("biceps", [r"^(Long|Short) head of right biceps brachii$"], "#9c3b6a", 2000, clip=[(-500, -400, 1180), (0, 400, 1500)]),
        dict(key="scapula", sel=[r"^Right scapula$"], color="#e9dcc0", faces=3000),
        dict(key="clavicle", sel=[r"^Right clavicle$"], color="#d9c8a0", faces=1000),
        dict(key="humerus", sel=[r"^Right humerus$"], color="#cdb98f", faces=2500, clip=[(-500, -400, 1180), (0, 400, 1500)]),
    ]),
    # 06 무릎(오른쪽)
    "knee": dict(groups=[
        M("quads", [r"^Right (rectus femoris|vastus (lateralis|medialis|intermedius))$"], "#d0563f", 4000, alpha=0.55),
        M("hamstrings", [r"^(Long head of right biceps femoris|Short head of right biceps femoris|Right semitendinosus|Right semimembranosus)$"], "#9c3b6a", 2500, alpha=0.6),
        M("gastroc", [r"head of right gastrocnemius$"], "#3f8fb0", 2500, alpha=0.6),
        M("popliteus", [r"^Right popliteus$"], "#5fb0d0", 800),
        dict(key="femur", sel=[r"^Right femur$"], color="#e9dcc0", faces=2500),
        dict(key="patella", sel=[r"^Right patella$"], color="#f0b27a", faces=800),
        dict(key="tibia", sel=[r"^Right tibia$"], color="#d9c8a0", faces=2000),
        dict(key="fibula", sel=[r"^Right fibula$"], color="#cdb98f", faces=1000),
    ], box=[(-500, -400, 330), (0, 400, 600)]),
    # 07 몸통과 목의 근육
    "trunkmuscles": dict(groups=[
        M("erector", [r"iliocostalis|longissimus|^(Left|Right) spinalis|spinalis thoracis$"], "#d0563f", 8000),
        M("deepback", [r"semispinalis|rotator$|interspinal|intertransvers|levatores costarum|multifidus"], "#e0a040", 6000),
        M("trapezius", [r"part of (left |right )?trapezius$"], "#9c3b6a", 5000),
        M("rhomboid", [r"rhomboid (major|minor)$|levator scapulae$|serratus posterior"], "#c9784a", 4000),
        M("splenius", [r"splenius (capitis|cervicis)$|rectus capitis|obliquus capitis|longus (colli|capitis)"], "#b0864a", 4000),
        M("chest", [r"part of (left |right )?pectoralis major$|pectoralis minor$|subclavius$|serratus anterior$"], "#3f8fb0", 7000),
        M("abdominal", [r"external oblique$|^Linea alba$"], "#5fb0d0", 6000, alpha=0.75),
        M("intercostal", [r"intercostal muscle$|transversus thoracis$"], "#8f6fb8", 6000),
        M("neck", [r"sternocleidomastoid$|scalenus"], "#4caf7a", 4000),
        M("hyoidm", [r"sternohyoid$|sternothyroid$|thyrohyoid$|omohyoid$|digastric$|mylohyoid$|geniohyoid$|stylohyoid$|^(Left|Right )?platysma$"], "#9fcf5f", 3000),
        M("diaphragm", [r"^Diaphragm$"], "#e07a6a", 4000),
        dict(key="skeleton", sel=["FMA46565", "FMA13478", "FMA7480", r"^Sacrum$", r"^(Left|Right) (hip bone|clavicle|scapula)$", r"costal cartilage$|^Manubrium$|^Body of sternum$|^Xiphoid process$"], exclude=NOT_BONE + [r"tooth|disk"], color=BONE, alpha=0.3, faces=12000),
    ]),
    # 07 후두
    "larynx": dict(groups=[
        dict(key="thyroidc", sel=[r"^Thyroid cartilage$"], color="#8fbfe0", faces=2500),
        dict(key="cricoid", sel=[r"^Cricoid cartilage$"], color="#9fd08f", faces=1500),
        dict(key="arytenoid", sel=[r"arytenoid cartilage$|corniculate cartilage$|cuneiform cartilage$"], color="#f2d06b", faces=1000),
        dict(key="epiglottis", sel=[r"^Epiglottis$"], color="#e8a0b8", faces=1000),
        dict(key="hyoid", sel=[r"^Hyoid bone$"], color="#e9dcc0", faces=1200),
        dict(key="vocal", sel=[r"vocal ligament$|conus elasticus$"], color="#ffffff", faces=800),
        dict(key="membranes", sel=[r"thyrohyoid membrane$|thyrohyoid ligament$|cricothyroid ligament$|epiglottic ligament$"], color="#d8d0c0", alpha=0.6, faces=1500),
        M("muscles", [r"cricothyroid$|vocalis$|thyro-arytenoid$|crico-arytenoid$|arytenoid$|aryepiglotticus$"], "#d0563f", 2500),
        dict(key="trachea", sel=[r"^Trachea$"], color="#ece2cc", faces=1500, clip=[(-300, -400, 1330), (300, 400, 1500)]),
    ]),
    # 08 가슴 안
    "thorax": dict(groups=[
        dict(key="heart", sel=[r"^Wall of (ventricle|right atrium|left atrium)$"], color="#b8463c", faces=9000),
        dict(key="aorta", sel=[r"^Ascending aorta$|^Arch of aorta$|^Descending thoracic aorta$|^Descending aorta$|Brachiocephalic artery$|common carotid artery$|subclavian artery$"], color=ARTERY, faces=4000, clip=[(-300, -400, 990), (300, 400, 1380)]),
        dict(key="pulmart", sel=["FMA7309&artery", "FMA7310&artery", r"^Pulmonary trunk$|^(Right|Left) pulmonary artery$"], color="#5a73d8", faces=9000),
        dict(key="pulmvein", sel=["FMA7309&vein", "FMA7310&vein", r"(superior|inferior) pulmonary vein$"], color="#e0574a", faces=9000),
        dict(key="venacava", sel=[r"^Superior vena cava$|^Inferior vena cava$|brachiocephalic vein$|^Azygos vein$|hemiazygos vein$"], color=VEIN, faces=4000, clip=[(-300, -400, 990), (300, 400, 1380)]),
        dict(key="airway", sel=["FMA7393", r"^Trachea$", "FMA7309&bronch", "FMA7310&bronch"], color="#ece2cc", faces=14000),
        dict(key="esophagus", sel=[r"^Esophagus$"], color="#d98a7a", faces=2000, clip=[(-300, -400, 990), (300, 400, 1400)]),
        dict(key="thymus", sel=[r"lobe of thymus$"], color="#9fc26a", faces=2000),
        dict(key="diaphragm", sel=[r"^Diaphragm$"], color="#c7705c", alpha=0.45, faces=5000),
        dict(key="ribs", sel=["FMA7480", r"costal cartilage$|^Manubrium$|^Body of sternum$|^Xiphoid process$"], color=BONE, alpha=0.22, faces=10000),
        dict(key="spine", sel=["FMA9139"], color=BONE, alpha=0.4, faces=4000),
    ]),
    # 09 배 안
    "abdomen": dict(groups=[
        dict(key="liver", sel=["FMA7197"], exclude=[r"artery|vein|duct"], color="#8f3b32", faces=8000),
        dict(key="gallbladder", sel=[r"^Gallbladder$|^Cystic duct$|hepatic duct$"], color="#5aa05a", faces=1500),
        dict(key="stomach", sel=["FMA7148"], color="#e2867a", faces=5000),
        dict(key="spleen", sel=[r"^Spleen$"], color="#7c3a5a", faces=2000),
        dict(key="pancreas", sel=[r"^Pancreas$|^Parenchyma of pancreas$"], color="#f2cf5b", faces=3000),
        dict(key="duodenum", sel=[r"^Duodenum$"], color="#e7a98d", faces=2500),
        dict(key="appendix", sel=[r"^Appendix$"], color="#f0a0a0", faces=500),
        dict(key="rectum", sel=[r"^Rectum$"], color="#b97a5a", faces=1500),
        dict(key="smallint", sel=["FMA7200"], color="#efb79a", faces=10000),
        dict(key="largeint", sel=["FMA7201"], color="#c98d6e", faces=8000),
        dict(key="kidneys", sel=[r"^(Right|Left) kidney$"], color="#a9554b", faces=4000),
        dict(key="adrenal", sel=[r"adrenal gland$"], color="#e5b443", faces=1500),
        dict(key="ureters", sel=[r"^(Right|Left) ureter$"], color="#e2cf74", faces=1500),
        dict(key="bladder", sel=[r"^Urinary bladder$"], color="#e6bf72", faces=1500),
        dict(key="aorta", sel=[r"^Abdominal aorta$|common iliac artery$|^Celiac trunk$|^Trunk of superior mesenteric artery$|renal artery$"], color=ARTERY, faces=3000),
        dict(key="ivc", sel=[r"^Inferior vena cava$|common iliac vein$|renal vein$"], color=VEIN, faces=3000, clip=[(-300, -400, 780), (300, 400, 1150)]),
        dict(key="portal", sel=[r"portal vein$|^Splenic vein$|superior mesenteric vein$"], color="#6a5acd", faces=2000),
        dict(key="diaphragm", sel=[r"^Diaphragm$"], color="#c7705c", alpha=0.3, faces=4000),
        dict(key="skeleton", sel=["FMA9921", r"(Ninth|Tenth|Eleventh|Twelfth) thoracic vertebra$", r"^Sacrum$", r"^(Left|Right) hip bone$", r"(eighth|ninth|tenth|eleventh|twelfth) rib$"], color=BONE, alpha=0.25, faces=7000),
    ]),
    # 09 골반 안(남성 모델)
    "pelvis": dict(groups=[
        dict(key="bladder", sel=[r"^Urinary bladder$"], color="#e6bf72", faces=2000),
        dict(key="prostate", sel=[r"^Prostate$"], color="#d98fb0", faces=1200),
        dict(key="seminal", sel=[r"seminal vesicle$|deferent duct$"], color="#8fbfe0", faces=2000),
        dict(key="testis", sel=[r"testis$|epididymis$"], color="#8aa6ea", faces=2000),
        dict(key="penis", sel=[r"^Corpus (cavernosum|spongiosum) of penis$|^Glans penis$"], color="#e0a090", faces=2500),
        dict(key="urethra", sel=[r"^Urethra$"], color="#f2d06b", faces=800),
        dict(key="rectum", sel=[r"^Rectum$"], color="#b97a5a", faces=1500),
        M("floor", [r"iliococcygeus$|pubococcygeus$|puborectalis$|coccygeus$|^External anal sphincter$|Tendinous arch of"], "#c94f4f", 3000),
        dict(key="ureters", sel=[r"^(Right|Left) ureter$"], color="#e2cf74", faces=1000, clip=[(-300, -400, 700), (300, 400, 900)]),
        dict(key="vessels", sel=[r"(internal|external|common) iliac (artery|vein)$"], color=ARTERY, faces=2500),
        dict(key="bones", sel=[r"^(Left|Right) hip bone$", r"^Sacrum$", r"^(Left|Right) femur$"], color=BONE, alpha=0.3, faces=5000, clip=[(-400, -400, 650), (400, 400, 1000)]),
    ]),
    # 10 뇌의 겉
    "brain": dict(groups=[
        dict(key="frontal", sel=[r"(superior|middle|inferior) frontal gyrus$|orbital gyrus$"], color="#e8a37b", faces=8000),
        dict(key="motor", sel=[r"precentral gyrus$"], color="#e2715f", faces=3000),
        dict(key="sensory", sel=[r"postcentral gyrus$"], color="#5fa6d8", faces=3000),
        dict(key="parietal", sel=[r"superior parietal lobule$|supramarginal gyrus$|angular gyrus$"], color="#8dbbe0", faces=6000),
        dict(key="temporal", sel=[r"temporal gyrus$|fusiform gyrus$|parahippocampal gyrus$"], color="#9ccb88", faces=7000),
        dict(key="occipital", sel=[r"occipital lobe$"], color="#c39cd8", faces=3000),
        dict(key="limbic", sel=[r"cingulate gyrus$|insula$"], color="#f2c46b", faces=3000),
        dict(key="cerebellum", sel=[r"^Cerebellum$"], color="#d98b8b", faces=7000),
        dict(key="brainstem", sel=[r"^(Midbrain|Pons|Medulla oblongata)$|Peduncle of"], color="#e4c27a", faces=4000),
        dict(key="nerves", sel=[r"optic nerve$|^Optic chiasm$|optic tract$|oculomotor nerve$|trochlear nerve$|ophthalmic nerve$"], color=NERVE, faces=2000),
        dict(key="white", sel=[r"^White matter of (left|right) cerebral hemisphere$"], color="#f1ebdd", faces=6000),
    ]),
    # 10 뇌의 속
    "braindeep": dict(groups=[
        dict(key="ventricles", sel=[r"lateral ventricle$|^Third ventricle$|^Fourth ventricle$|^Cerebral aqueduct$|interventricular foramen$"], color="#4fb3e8", faces=5000),
        dict(key="thalamus", sel=[r"thalamus$|geniculate body$"], color="#f2c46b", faces=3000),
        dict(key="hypothalamus", sel=[r"^Hypothalamus$|^Tuber cinereum$|mammillary body$|^Pituitary gland$"], color="#ff5fa2", faces=1500),
        dict(key="caudate", sel=[r"caudate nucleus$"], color="#9ccb88", faces=2500),
        dict(key="lentiform", sel=[r"putamen$|globus pallidus$"], color="#7fd1c7", faces=3000),
        dict(key="hippocampus", sel=[r"hippocampus$|amygdala$"], color="#e8a37b", faces=2500),
        dict(key="callosum", sel=[r"^Corpus callosum$|fornix of forebrain$"], color="#c39cd8", faces=3000),
        dict(key="capsule", sel=[r"internal capsule$"], color="#f1ebdd", faces=2500),
        dict(key="brainstem", sel=[r"^(Midbrain|Pons|Medulla oblongata)$|Peduncle of"], color="#e4c27a", faces=3000),
        dict(key="cerebellum", sel=[r"^Cerebellum$"], color="#d98b8b", alpha=0.35, faces=4000),
        dict(key="cortex", sel=["FMA50801"], exclude=[r"choroid plexus"], color="#e6c9bd", alpha=0.12, faces=10000),
    ]),
    # 10 눈(오른쪽)
    "eye": dict(groups=[
        dict(key="cornea", sel=[r"^Right cornea$"], color="#bfe6ff", alpha=0.5, faces=1000),
        dict(key="sclera", sel=[r"^Right sclera$"], color="#f6f2ea", faces=3000),
        dict(key="iris", sel=[r"^Right iris$|corona ciliaris|^Right choroid$"], color="#5a7fbf", faces=2000),
        dict(key="lens", sel=[r"^Right lens$|Suspensory ligament of right lens"], color="#f2e6a0", faces=800),
        dict(key="vitreous", sel=[r"vitreous body$|chamber of right eyeball"], color="#cfe8f0", alpha=0.35, faces=1500),
        dict(key="retina", sel=[r"Optic part of right retina"], color="#e07a6a", faces=2000),
        M("recti", [r"^Right (superior|inferior|medial|lateral) rectus$|common tendinous ring|Check ligament of right"], "#c9574a", 4000),
        M("obliques", [r"^Right (superior|inferior) oblique$|Trochlea of right"], "#e0a040", 2000),
        M("levator", [r"levator palpebrae superioris|Tarsal plate of (upper|lower) eyelid"], "#b0864a", 1500),
        dict(key="opticnerve", sel=[r"^Right optic nerve$"], color=NERVE, faces=1000),
        dict(key="lacrimal", sel=[r"right lacrimal (gland|canaliculus|sac|lake)$|right nasolacrimal duct$|^Right lacrimal gland$"], color="#7fd1c7", faces=1500),
    ], box=[(-200, -400, 1440), (-2, 400, 1700)]),
    # 11 동맥
    "arteries": dict(groups=[
        dict(key="aorta", sel=[r"^Ascending aorta$|^Arch of aorta$|^Descending thoracic aorta$|^Descending aorta$|^Abdominal aorta$|Brachiocephalic artery$"], color="#c0262a", faces=5000),
        dict(key="coronary", sel=[r"coronary artery|interventricular branch of left|conus|septal branch|marginal branch"], color="#ff6a50", faces=3000),
        dict(key="headneck", sel=[r"carotid artery$|vertebral artery$|^Basilar artery$|cerebral artery|communicating artery|cerebellar artery|ophthalmic artery$|choroidal artery$|thyroid artery$|frontobasal|callosomarginal|pericallosal|parietal artery|temporal artery$|occipital artery|sulcus|prefrontal|splenial|thalamo|polar temporal"], color="#e8553a", faces=8000),
        dict(key="upperlimb", sel=[r"subclavian artery$|axillary artery$|brachial artery$|radial artery$|ulnar artery$|palmar|interosseous artery$|humeral artery$|collateral artery$|recurrent artery$|princeps pollicis|radialis indicis|thoraco-acromial|digital artery|thoracodorsal artery$|subscapular artery$|scapular artery$|lateral thoracic artery$"], color="#f0904a", faces=8000),
        dict(key="visceral", sel=[r"celiac|hepatic artery|gastric artery$|splenic artery$|gastro-epiploic|mesenteric artery|renal artery|colic artery|ileal artery|ileocolic artery|pancreatic|pancreaticoduodenal|cecal artery|appendicular|sigmoid artery|rectal artery|suprarenal artery|testicular artery|gastroduodenal|phrenic artery|esophageal|oesophageal|bronchial artery"], color="#c94fa0", faces=8000),
        dict(key="lowerlimb", sel=[r"iliac artery$|femoral artery$|popliteal artery$|tibial artery$|dorsalis pedis|plantar|genicular artery$|perforating arter|circumflex femoral artery$|arcuate artery$|tarsal artery$|deep plantar|metatarsal artery|calcaneal branches|digital arter"], color="#e0a030", faces=9000),
        dict(key="trunkwall", sel=[r"intercostal arter|lumbar artery$|epigastric artery$|internal thoracic artery$|musculophrenic artery$|subcostal artery$|costocervical|thyrocervical|cervical artery$|spinal artery$|pudendal|dorsal artery of penis"], color="#d07a7a", faces=4000),
        dict(key="other", sel=["FMA45623"], exclude=[r"pulmonary|segmental artery"], color=ARTERY, faces=4000),
        dict(key="heart", sel=[r"^Wall of (ventricle|right atrium|left atrium)$"], color="#b8463c", alpha=0.35, faces=4000),
        dict(key="skin", sel=[r"^Skin$"], color="#d9b49a", alpha=0.08, faces=10000),
    ]),
    # 11 정맥
    "veins": dict(groups=[
        dict(key="cava", sel=[r"^Superior vena cava$|^Inferior vena cava$|brachiocephalic vein$|^Azygos vein$|hemiazygos vein$"], color="#2a4fb0", faces=4000),
        dict(key="headneck", sel=[r"jugular vein$|thyroid vein|vertebral vein"], color="#4a7fe0", faces=3000),
        dict(key="superficialup", sel=[r"cephalic vein$|basilic vein$|median cubital vein$|median antebrachial vein$|dorsal venous network of|dorsal metacarpal vein|palmar digital vein|superficial palmar venous"], color="#5fb0e8", faces=5000),
        dict(key="deepup", sel=[r"subclavian vein$|axillary vein$|brachial vein$|radial vein$|ulnar vein$|deep palmar venous|palmar metacarpal vein|humeral vein$|scapular vein$|subscapular vein$|thoracodorsal vein$|lateral thoracic vein$"], color="#3d63c4", faces=5000),
        dict(key="superficiallow", sel=[r"saphenous vein$|dorsal venous arch of|dorsal digital vein|superficial epigastric vein$"], color="#5fd0c0", faces=5000),
        dict(key="deeplow", sel=[r"iliac vein$|femoral vein$|popliteal vein$|tibial vein$|fibular vein$|genicular vein$|plantar|gluteal vein$|obturator vein$|pudendal vein$|perforating veins|circumflex femoral vein$|sacral vein$|iliolumbar vein$"], color="#3a8fa0", faces=6000),
        dict(key="portal", sel=[r"portal vein$|splenic vein$|mesenteric vein$|gastric vein$|gastroepiploic vein$|colic vein$|ileal vein$|ileocolic vein$|pancreaticoduodenal vein$|sigmoid vein$|rectal vein$"], color="#7a5acd", faces=4000),
        dict(key="other", sel=["FMA66644"], exclude=[r"pulmonary|cardiac|segmental|Coronary sinus|marginal vein|interventricular vein|vein of left ventricle"], color=VEIN, faces=5000),
        dict(key="heart", sel=[r"^Wall of (ventricle|right atrium|left atrium)$"], color="#b8463c", alpha=0.35, faces=4000),
        dict(key="skin", sel=[r"^Skin$"], color="#d9b49a", alpha=0.08, faces=10000),
    ]),
}


def srgb2lin(h):
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def build(name, spec, out):
    parts = []
    for g, els in bp3d.groups_elements(spec["groups"]):
        m = bp3d.merged(els, g.get("clip", spec.get("box")))
        if m is None or len(m.faces) == 0:
            print(f"  ! {name}/{g['key']}: no elements"); continue
        n0 = len(m.faces)
        if n0 > g["faces"]:
            vv, ff = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32),
                                                  target_reduction=1 - g["faces"] / n0)
            m = trimesh.Trimesh(vv, ff, process=True)
        parts.append((g, m))
        print(f"  {name}/{g['key']}: {len(els)} el, {n0} -> {len(m.faces)} faces")
    allv = np.vstack([m.vertices for _, m in parts])
    ctr = (allv.min(0) + allv.max(0)) / 2
    scene = trimesh.Scene()
    for g, m in parts:
        v = (m.vertices - ctr) * 0.001
        m.vertices = np.c_[v[:, 0], v[:, 2], -v[:, 1]]  # 원본 z 위, -y 앞 -> glTF y 위, +z 보는 사람 쪽
        a = g.get("alpha", 1.0)
        mat = trimesh.visual.material.PBRMaterial(
            name=g["key"], baseColorFactor=list(srgb2lin(g["color"])) + [a], metallicFactor=0.0,
            roughnessFactor=g.get("rough", 0.55), alphaMode="BLEND" if a < 1 else "OPAQUE", doubleSided=a < 1)
        m.visual = trimesh.visual.TextureVisuals(material=mat)
        scene.add_geometry(m, node_name=g["key"], geom_name=g["key"])
    raw = os.path.join(out, f"{name}.raw.glb")
    scene.export(raw)
    return raw


if __name__ == "__main__":
    BP, OUT = sys.argv[1], sys.argv[2]
    ONLY = set(sys.argv[3:])
    bp3d.init(BP)
    os.makedirs(OUT, exist_ok=True)
    for name, spec in MODELS.items():
        if ONLY and name not in ONLY:
            continue
        print(name)
        build(name, spec, OUT)
