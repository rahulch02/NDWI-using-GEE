var roi: Polygon, 4 vertices
  type: 
    Polygon
    coordinates: List (1 element)
      0: List (5 elements)
        0: [69.35451082095017,23.024172362085835]
        1: [71.82643464907517,23.024172362085835]
        2: [71.82643464907517,24.472190489638876]
        3: [69.35451082095017,24.472190489638876]
        4: [69.35451082095017,23.024172362085835]


print('Land Area of roi:', roi.area(0.1)); 
 // Land Area of Region of Interest

var points = ee.FeatureCollection.randomPoints(roi, 10);   // Randomly Select 10 points in ROI
Map.addLayer(points, {color:'green'}, 'Random Locations');
var points = points.map(function(feature) { return ee.Feature(feature.geometry(), {'id': feature.id()})} );


//lets clear the cloud from image
//from the image bit 3 and bit 5 is a cloud and shadow clouds, so we must mask that bits
function maskL8(col) {
  var cloudshadowbitmask = (1 << 3);
  var cloudsbitmask = (1 << 5);
  var qa = col.select('pixel_qa');
  var mask = qa.bitwiseAnd(cloudshadowbitmask).eq(0)
                .and(qa.bitwiseAnd(cloudsbitmask).eq(0));
  return col.updateMask(mask);
} 

//We load the Landsat 8 Surface Reflectance dataset and mask out cloud & cloud shadow bits and take a median composite of images
var image = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
            .filterDate('2020-01-01','2021-01-01')
            .filterBounds(roi)
            //pre - filter to get less cloudy granules
            .filter(ee.Filter.lt('CLOUD_COVER', 20))
            .map(maskL8) 
            .median();

var vizParams = {                         // visualization parameters of the above image
  bands: ['B4', 'B3', 'B2'],
  min : 0,
  max : 3000,
  gamma : 1.4,
};
Map.addLayer(image, vizParams, '< 0.1 Cloud Cover');

// raw image without pre filter or cloud bit mask
var image2 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')   
            .filterDate('2020-01-01','2021-01-01')
            .filterBounds(roi)
            .median();
            
var vizParams = {
  bands: ['B4', 'B3', 'B2'],
  min : 0,
  max : 3000,
  gamma : 1.4,
};
Map.addLayer(image2, vizParams, 'RGB - Visualized image');

//Normalized Difference Water Index
var ndwi = image.normalizedDifference(['B3','B6']).rename('NDWI');
var ndwiParams = {
  min: -1,
  max: 1,
  palette: ['blue', 'white', 'green'],
}
Map.addLayer(ndwi, ndwiParams, 'NDWI');
//MNDWI
Map.setCenter(70.5, 23.82, 7.1);

function addNDWI(collect) {
  var ndwi = collect.normalizedDifference(['B3','B6']).rename('NDWI');
  return collect.addBands([ndwi])
}

var collection = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR').filterDate('2020-01-01','2021-01-01').filterBounds(roi).map(addNDWI);
Map.addLayer(collection.filterBounds(roi).median(), vizParams, 'ALL BANDS', 0);
print('Bands of the No-Cloud Region:', collection.median());

var chart = ui.Chart.image.seriesByRegion({
  imageCollection: collection.select(['NDWI']),
  regions: points,
  reducer: ee.Reducer.mean(),
  });
print(chart);


