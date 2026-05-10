from backend.app import db, Attraction, Restaurant, Transportation, Accommodation


def seed_database():
    if Attraction.query.count() > 0:
        return

    attractions = [
        {'name': '七美雙心石滬', 'category': '自然景觀', 'location': '七美島', 'duration_hours': 2.0, 'price': 0, 'description': '世界唯一雙心形石滬，澎湖必打卡地標'},
        {'name': '吉貝沙尾', 'category': '海灘', 'location': '吉貝島', 'duration_hours': 3.0, 'price': 0, 'description': '澎湖最美白沙灘，水上活動天堂'},
        {'name': '望安綠蠵龜', 'category': '生態體驗', 'location': '望安島', 'duration_hours': 2.0, 'price': 150, 'description': '台灣最大綠蠵龜產卵地（季節限定 5-10月）'},
        {'name': '澎湖天后宮', 'category': '文化古蹟', 'location': '馬公市', 'duration_hours': 1.0, 'price': 0, 'description': '台灣最古老媽祖廟，建於1604年'},
        {'name': '通樑古榕', 'category': '自然景觀', 'location': '白沙鄉', 'duration_hours': 1.0, 'price': 0, 'description': '300年老榕樹，枝幹覆蓋整座廟宇'},
        {'name': '奎壁山摩西分海', 'category': '自然景觀', 'location': '白沙鄉', 'duration_hours': 1.5, 'price': 0, 'description': '退潮時出現礫石步道通往赤嶼，壯觀奇景'},
        {'name': '西台古堡', 'category': '文化古蹟', 'location': '西嶼鄉', 'duration_hours': 1.5, 'price': 30, 'description': '清朝砲台遺址，歷史文化展示'},
        {'name': '漁翁島燈塔', 'category': '文化古蹟', 'location': '西嶼鄉', 'duration_hours': 1.0, 'price': 0, 'description': '台灣最古老西式燈塔，建於1778年'},
        {'name': '山水沙灘', 'category': '海灘', 'location': '馬公市', 'duration_hours': 2.0, 'price': 0, 'description': '馬公市區最近的沙灘，夕陽美景絕佳'},
        {'name': '風櫃洞', 'category': '自然景觀', 'location': '馬公市', 'duration_hours': 1.0, 'price': 0, 'description': '玄武岩海蝕洞，浪打岩石聲響壯觀'},
        {'name': '小門鯨魚洞', 'category': '自然景觀', 'location': '白沙鄉', 'duration_hours': 1.0, 'price': 0, 'description': '形似鯨魚的天然拱形海蝕洞'},
        {'name': '澎湖跨海大橋', 'category': '地標', 'location': '白沙/西嶼', 'duration_hours': 0.5, 'price': 0, 'description': '台灣最長跨海大橋，騎車過橋必打卡'},
        {'name': '馬公老街', 'category': '文化古蹟', 'location': '馬公市', 'duration_hours': 1.5, 'price': 0, 'description': '百年歷史老街，購物伴手禮首選'},
        {'name': '吉貝水上活動', 'category': '水上活動', 'location': '吉貝島', 'duration_hours': 3.0, 'price': 500, 'description': '香蕉船、拖曳傘、浮潛等各式水上活動'},
        {'name': '龍門里摩西分海', 'category': '自然景觀', 'location': '馬公市', 'duration_hours': 2.0, 'price': 0, 'description': '分海奇景，免費入場'},
        {'name': '澎湖水族館', 'category': '室內景點', 'location': '馬公市', 'duration_hours': 2.0, 'price': 180, 'description': '認識澎湖豐富海洋生態'},
        {'name': '員貝島浮潛', 'category': '水上活動', 'location': '員貝島', 'duration_hours': 4.0, 'price': 300, 'description': '人煙稀少秘境小島，珊瑚礁浮潛勝地'},
        {'name': '澎湖花火節', 'category': '節慶活動', 'location': '馬公市', 'duration_hours': 2.0, 'price': 0, 'description': '每年4-6月澎湖國際花火節（季節限定）'},
    ]
    for a in attractions:
        db.session.add(Attraction(**a))

    restaurants = [
        {'name': '東海活海鮮', 'category': '海鮮', 'location': '馬公市', 'meal_type': '午晚餐', 'price_per_person': 600, 'description': '現撈海鮮，活體現點現煮'},
        {'name': '一品海鮮', 'category': '海鮮', 'location': '馬公市', 'meal_type': '午晚餐', 'price_per_person': 500, 'description': '口碑老店，龍蝦生魚片推薦'},
        {'name': '阿婆魚麵', 'category': '小吃', 'location': '馬公市', 'meal_type': '午餐', 'price_per_person': 150, 'description': '澎湖傳統魚麵，銅板美食'},
        {'name': '菊島之星海鮮', 'category': '海鮮', 'location': '馬公市', 'meal_type': '晚餐', 'price_per_person': 700, 'description': '澎湖特色餐廳，海鮮拼盤豐盛'},
        {'name': '橋邊鮮', 'category': '海鮮', 'location': '馬公市', 'meal_type': '午晚餐', 'price_per_person': 400, 'description': '港邊新鮮直送，CP值高'},
        {'name': '廟口活海鮮', 'category': '海鮮', 'location': '馬公市', 'meal_type': '晚餐', 'price_per_person': 450, 'description': '天后宮附近老店，在地美味'},
        {'name': '啟元海鮮', 'category': '海鮮', 'location': '馬公市', 'meal_type': '午晚餐', 'price_per_person': 550, 'description': '螃蟹料理為主，新鮮到位'},
        {'name': '漁港生魚片', 'category': '海鮮', 'location': '馬公市', 'meal_type': '午餐', 'price_per_person': 300, 'description': '馬公漁港現切生魚片，超級新鮮'},
        {'name': '西門早餐店', 'category': '早餐', 'location': '馬公市', 'meal_type': '早餐', 'price_per_person': 80, 'description': '澎湖傳統早餐，燒餅油條豆漿'},
        {'name': '仙人掌冰', 'category': '冰品', 'location': '馬公市', 'meal_type': '全天', 'price_per_person': 60, 'description': '澎湖特產仙人掌冰，必吃名物'},
        {'name': '七美石老人海鮮', 'category': '海鮮', 'location': '七美島', 'meal_type': '午餐', 'price_per_person': 400, 'description': '七美島現撈海鮮，島上最推薦'},
        {'name': '吉貝海景餐廳', 'category': '海鮮', 'location': '吉貝島', 'meal_type': '午餐', 'price_per_person': 350, 'description': '吉貝島海邊餐廳，看海吃飯'},
        {'name': '老奶奶黑糖糕', 'category': '小吃', 'location': '馬公市', 'meal_type': '全天', 'price_per_person': 50, 'description': '澎湖必買伴手禮黑糖糕'},
        {'name': '飯店早餐（含）', 'category': '早餐', 'location': '馬公市', 'meal_type': '早餐', 'price_per_person': 0, 'description': '飯店含早，不需另計費用'},
    ]
    for r in restaurants:
        db.session.add(Restaurant(**r))

    transportations = [
        # 來回交通 — 立榮航空（價格來源：2026接團明細表）
        {'type': '飛機', 'name': '台北松山↔馬公 飛機來回（立榮）', 'price_per_person': 4289, 'price_child': 3646, 'price_senior': 2145, 'price_per_unit': 0, 'unit': '人', 'description': '立榮航空，飛行約50分鐘'},
        {'type': '飛機', 'name': '台中↔馬公 飛機來回（立榮）',     'price_per_person': 3329, 'price_child': 2830, 'price_senior': 1665, 'price_per_unit': 0, 'unit': '人', 'description': '立榮航空，飛行約40分鐘'},
        {'type': '飛機', 'name': '高雄↔馬公 飛機來回（立榮）',     'price_per_person': 3538, 'price_child': 3007, 'price_senior': 1769, 'price_per_unit': 0, 'unit': '人', 'description': '立榮航空，飛行約30分鐘'},
        {'type': '飛機', 'name': '台南↔馬公 飛機來回（立榮）',     'price_per_person': 3208, 'price_child': 2727, 'price_senior': 1604, 'price_per_unit': 0, 'unit': '人', 'description': '立榮航空'},
        {'type': '飛機', 'name': '嘉義↔馬公 飛機來回（立榮）',     'price_per_person': 3262, 'price_child': 2773, 'price_senior': 1631, 'price_per_unit': 0, 'unit': '人', 'description': '立榮航空'},
        # 來回交通 — 華信航空
        {'type': '飛機', 'name': '台北松山↔馬公 飛機來回（華信）', 'price_per_person': 4362, 'price_child': 3272, 'price_senior': 2181, 'price_per_unit': 0, 'unit': '人', 'description': '華信航空，飛行約50分鐘'},
        {'type': '飛機', 'name': '台中↔馬公 飛機來回（華信）',     'price_per_person': 3257, 'price_child': 2443, 'price_senior': 1629, 'price_per_unit': 0, 'unit': '人', 'description': '華信航空，飛行約40分鐘'},
        {'type': '飛機', 'name': '高雄↔馬公 飛機來回（華信）',     'price_per_person': 3731, 'price_child': 2798, 'price_senior': 1866, 'price_per_unit': 0, 'unit': '人', 'description': '華信航空，飛行約30分鐘'},
        # 來回交通 — 船
        {'type': '船', 'name': '嘉義布袋↔馬公 客輪來回',           'price_per_person': 1950, 'price_child': 0, 'price_senior': 0, 'price_per_unit': 0, 'unit': '人', 'description': '去程$1000+回程$950，航行約100分鐘'},
        {'type': '船', 'name': '台中↔馬公 客輪來回',               'price_per_person': 1600, 'price_child': 0, 'price_senior': 0, 'price_per_unit': 0, 'unit': '人', 'description': '夜班船，航行約8小時'},
        # 當地交通
        {'type': '機車', 'name': '租機車（一台/天）', 'price_per_person': 0, 'price_per_unit': 500, 'unit': '台/天', 'description': '125cc機車，含油來回'},
        {'type': '腳踏車', 'name': '租電動自行車（一台/天）', 'price_per_person': 0, 'price_per_unit': 250, 'unit': '台/天', 'description': '電動輔助自行車'},
        {'type': '包車', 'name': '包車半日遊（4小時）', 'price_per_person': 0, 'price_per_unit': 2000, 'unit': '次', 'description': '7人座，含司機，馬公本島'},
        {'type': '包車', 'name': '包車全日遊（8小時）', 'price_per_person': 0, 'price_per_unit': 3500, 'unit': '次', 'description': '7人座，含司機，馬公+西嶼'},
        # 離島船班
        {'type': '離島船', 'name': '北海遊艇行程（吉貝+北海）', 'price_per_person': 600, 'price_per_unit': 0, 'unit': '人', 'description': '吉貝、員貝、鐵砧等北海島嶼'},
        {'type': '離島船', 'name': '南海一日遊（七美+望安）', 'price_per_person': 1200, 'price_per_unit': 0, 'unit': '人', 'description': '南方四島精華，含導覽'},
        {'type': '離島船', 'name': '吉貝島往返船票', 'price_per_person': 500, 'price_per_unit': 0, 'unit': '人', 'description': '赤馬漁港出發，來回船票'},
    ]
    for t in transportations:
        db.session.add(Transportation(**t))

    accommodations = [
        {'name': '澎湖福朋喜來登酒店', 'type': '五星飯店', 'location': '馬公市', 'price_per_room_night': 6000, 'description': '澎湖最高級飯店，海景房景色優'},
        {'name': '翰品酒店 澎湖', 'type': '四星飯店', 'location': '馬公市', 'price_per_room_night': 3500, 'description': '市區精品飯店，服務優質'},
        {'name': '馬公老爺行旅', 'type': '四星飯店', 'location': '馬公市', 'price_per_room_night': 3200, 'description': '設計風格旅店，早餐豐盛'},
        {'name': '澎湖大倉逸墅', 'type': '三星飯店', 'location': '馬公市', 'price_per_room_night': 2500, 'description': '整潔舒適，交通便利'},
        {'name': '海景精品民宿', 'type': '民宿', 'location': '馬公市', 'price_per_room_night': 2000, 'description': '有海景的精緻民宿'},
        {'name': '一畝田渡假民宿', 'type': '民宿', 'location': '白沙鄉', 'price_per_room_night': 1800, 'description': '田園風格，安靜舒適'},
        {'name': '七美海景民宿', 'type': '民宿', 'location': '七美島', 'price_per_room_night': 1500, 'description': '七美島上，感受離島生活'},
        {'name': '吉貝沙灘民宿', 'type': '民宿', 'location': '吉貝島', 'price_per_room_night': 1800, 'description': '步行即達吉貝沙灘'},
    ]
    for a in accommodations:
        db.session.add(Accommodation(**a))

    db.session.commit()
    print('Seed data OK')
