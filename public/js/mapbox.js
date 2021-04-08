/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoia29zMyIsImEiOiJja24ycDN1b24weWRyMm9scjJqM2R4czdhIn0.6LRqVQ6Ff2ABiNEf65NuSg';

  const map = new mapboxgl.Map({
    container: 'map', // the element of the ID (= map)
    style: 'mapbox://styles/mapbox/light-v10',
    scrollZoom: false,
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: false, // 操作できなくなる
  });
  // More options
  // https://docs.mapbox.com/mapbox-gl-js/api/map/

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Add marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
      // the bottom of the marker points to the location
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // // Add popup
    map.on('click', () => {
      new mapboxgl.Popup({ offset: [0, -30] })
        .setHTML(
          `<p>Day ${loc.day}: ${loc.description}</p>`
        )
        .setLngLat(loc.coordinates)
        .addTo(map);
    });

    // Extend map bounds to include tour locations
    // markerのある範囲までマップをextend?
    bounds.extend(loc.coordinates);
  });

  // zoom in to fit all the markers
  map.fitBounds(bounds, {
    // サイトのデザインで斜めに切り込みを入れているため、paddingを設定
    padding: {
      top: 200, // = px
      bottom: 200,
      // left: 100,
      // right: 100,
    },
  });
};

/*
Andy
4 months ago
0
Guys later on need to add a bit for stripe

.set(

'Content-Security-Policy',

"default-src 'self' https://*.mapbox.com https://*.stripe.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com https://is.stripe.com/V3 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
*/
