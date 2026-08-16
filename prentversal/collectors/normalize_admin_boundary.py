# 행정동 SHP를 GeoJSON으로 정규화

# 이 파일에서 사용할 외부 모듈과 프로젝트 공통 기능 불러옴
import geopandas as gpd

from collectors.manual_common import RAW, REF, SEOUL_DISTRICT_CODES, pick_column

OUTPUT = REF / "admin_dong_boundary.geojson"


# 행정동 SHP를 WGS84 GeoJSON으로 정리하고 면적/자치구 정보를 함께 저장함
def main() -> None:
    folder = RAW / "admin_dong_boundary"
    shp_files = list(folder.glob("*.shp"))
    if not shp_files:
        raise FileNotFoundError(f"SHP 파일이 없습니다: {folder}")

    gdf = gpd.read_file(shp_files[0])

    code_col = pick_column(gdf, ["ADSTRD_CD", "adstrd_cd", "행정동코드"])
    name_col = pick_column(gdf, ["ADSTRD_NM", "adstrd_nm", "행정동명"])

    # 공식 페이지 기준 좌표계가 없으면 EPSG:5181로 지정함
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:5181")

    metric = gdf.to_crs("EPSG:5181")
    gdf["area_km2"] = metric.geometry.area / 1_000_000

    gdf["admin_code"] = gdf[code_col].astype(str).str.replace(".0", "", regex=False)
    gdf["admin_name"] = gdf[name_col].astype(str).str.strip()
    gdf["district_name"] = gdf["admin_code"].str[:5].map(SEOUL_DISTRICT_CODES)

    out = gdf[["admin_code", "admin_name", "district_name", "area_km2", "geometry"]].copy()
    out = out[out["district_name"].notna()].to_crs("EPSG:4326")

    REF.mkdir(parents=True, exist_ok=True)
    out.to_file(OUTPUT, driver="GeoJSON", encoding="utf-8")
    print(f"saved: {OUTPUT} / {len(out):,} admin dongs")


if __name__ == "__main__":
    main()