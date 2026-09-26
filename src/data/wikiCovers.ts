/**
 * Обложки томов по умолчанию — оригинальные обложки японского издания
 * (MF Bunko J, KADOKAWA; иллюстрации Томосэ Сюнсаку) с You-Zitsu Wiki,
 * страницы «Light Novel Volume N» и «Light Novel 2nd Year Volume N».
 *
 * Файлы не копируются в проект: сайт показывает уменьшенные до 800 px
 * картинки прямо с сервера вики. Если картинка не загрузится, у тома
 * останется нарисованная обложка. Своя обложка из «Админки → Обложки»
 * важнее этих.
 */

const WIKI_IMAGES = 'https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/'

export const WIKI_COVERS: Record<string, string> = {
  'y1-v1': `${WIKI_IMAGES}c/c1/LN_Vol_01_cover.jpg/revision/latest/scale-to-width-down/567?cb=20210316155941`,
  'y1-v2': `${WIKI_IMAGES}1/1c/LN_Vol_02_cover.jpg/revision/latest/scale-to-width-down/567?cb=20210316162906`,
  'y1-v3': `${WIKI_IMAGES}f/f4/LN_Vol_03_cover.jpg/revision/latest/scale-to-width-down/567?cb=20210316163257`,
  'y1-v4': `${WIKI_IMAGES}8/80/LN_Vol_04_cover.jpg/revision/latest/scale-to-width-down/567?cb=20210316163645`,
  'y1-v4.5': `${WIKI_IMAGES}a/a1/LN_Vol_4.5_cover.jpg/revision/latest/scale-to-width-down/568?cb=20170901042719`,
  'y1-v5': `${WIKI_IMAGES}e/e8/LN_Vol_05_cover.jpg/revision/latest/scale-to-width-down/567?cb=20170901043548`,
  'y1-v6': `${WIKI_IMAGES}1/1f/LN_Vol_06_cover.jpg/revision/latest/scale-to-width-down/564?cb=20210316170159`,
  'y1-v7': `${WIKI_IMAGES}6/64/LN_Vol_07_cover.jpg/revision/latest/scale-to-width-down/564?cb=20171024161510`,
  'y1-v7.5': `${WIKI_IMAGES}5/52/LN_Vol_7.5_cover.jpg/revision/latest/scale-to-width-down/564?cb=20180124182423`,
  'y1-v8': `${WIKI_IMAGES}5/53/LN_Vol_08_cover.jpg/revision/latest/scale-to-width-down/564?cb=20210316171656`,
  'y1-v9': `${WIKI_IMAGES}f/f1/LN_Vol_09_cover.jpg/revision/latest/scale-to-width-down/564?cb=20210316172133`,
  'y1-v10': `${WIKI_IMAGES}3/36/LN_Vol_10_cover.jpg/revision/latest/scale-to-width-down/564?cb=20190122103123`,
  'y1-v11': `${WIKI_IMAGES}b/b0/LN_Vol_11_cover.jpg/revision/latest/scale-to-width-down/564?cb=20210316172653`,
  'y1-v11.5': `${WIKI_IMAGES}5/5b/LN_Vol_11.5_cover.jpg/revision/latest/scale-to-width-down/564?cb=20190924180938`,
  'y2-v1': `${WIKI_IMAGES}a/a1/LN_2nd_Year_Vol_01_cover.jpg/revision/latest/scale-to-width-down/564?cb=20210316154353`,
  'y2-v2': `${WIKI_IMAGES}0/01/LN_2nd_Year_Vol_02_cover.jpg/revision/latest/scale-to-width-down/564?cb=20200618085724`,
  'y2-v3': `${WIKI_IMAGES}5/53/LN_2nd_Year_Vol_03_cover.jpg/revision/latest/scale-to-width-down/564?cb=20201020045530`,
  'y2-v4': `${WIKI_IMAGES}7/7b/LN_2nd_Year_Vol_04_cover.jpg/revision/latest/scale-to-width-down/564?cb=20210316155519`,
  'y2-v4.5': `${WIKI_IMAGES}5/5f/LN_2nd_Year_Vol_4.5_cover.jpg/revision/latest/scale-to-width-down/564?cb=20210616124247`,
  'y2-v5': `${WIKI_IMAGES}3/3a/LN_2nd_Year_Vol_05_cover.jpg/revision/latest/scale-to-width-down/564?cb=20211021163952`,
  'y2-v6': `${WIKI_IMAGES}b/bb/LN_2nd_Year_Vol_06_cover.jpg/revision/latest/scale-to-width-down/564?cb=20220217050526`,
  'y2-v7': `${WIKI_IMAGES}d/d6/LN_2nd_Year_Vol_07_cover.jpg/revision/latest/scale-to-width-down/563?cb=20220603103345`,
  'y2-v8': `${WIKI_IMAGES}f/fe/LN_2nd_Year_Vol_08_cover.jpg/revision/latest/scale-to-width-down/564?cb=20221003105750`,
  'y2-v9': `${WIKI_IMAGES}c/c5/LN_2nd_Year_Vol_09_cover.jpg/revision/latest/scale-to-width-down/564?cb=20230224154746`,
  'y2-v9.5': `${WIKI_IMAGES}e/ed/LN_2nd_Year_Vol_9.5_cover.jpg/revision/latest/scale-to-width-down/564?cb=20230622184610`,
  'y2-v10': `${WIKI_IMAGES}e/e0/LN_2nd_Year_Vol_10_cover.jpg/revision/latest/scale-to-width-down/563?cb=20231004123957`,
  'y2-v11': `${WIKI_IMAGES}f/fe/LN_2nd_Year_Vol_11_cover.jpg/revision/latest/scale-to-width-down/564?cb=20240205110515`,
  'y2-v12': `${WIKI_IMAGES}b/b9/LN_2nd_Year_Vol_12_cover.jpg/revision/latest/scale-to-width-down/564?cb=20240707113317`,
  'y2-v12.5': `${WIKI_IMAGES}6/6c/LN_2nd_Year_Vol_12.5_cover.jpg/revision/latest/scale-to-width-down/564?cb=20250402235637`,
}
