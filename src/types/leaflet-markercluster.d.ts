import * as L from "leaflet";
import "leaflet.markercluster";

// Extend Leaflet types to include MarkerClusterGroup
declare module "leaflet" {
  namespace markercluster {
    interface MarkerClusterGroupOptions {
      chunkedLoading?: boolean;
      chunkInterval?: number;
      chunkDelay?: number;
      maxClusterRadius?: number;
      spiderfyOnMaxZoom?: boolean;
      showCoverageOnHover?: boolean;
      zoomToBoundsOnClick?: boolean;
      disableClusteringAtZoom?: number;
      iconCreateFunction?: (cluster: MarkerCluster) => L.Icon | L.DivIcon;
    }

    class MarkerCluster extends L.Marker {
      getChildCount(): number;
    }

    class MarkerClusterGroup extends L.FeatureGroup {
      constructor(options?: MarkerClusterGroupOptions);
      addLayer(layer: L.Layer): this;
      removeLayer(layer: L.Layer): this;
    }
  }

  function markerClusterGroup(options?: markercluster.MarkerClusterGroupOptions): markercluster.MarkerClusterGroup;
}
