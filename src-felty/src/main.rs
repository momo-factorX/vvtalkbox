// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{
    http::{header, StatusCode, Uri},
    response::IntoResponse,
    Router,
};
use tower_http::cors::CorsLayer;
use felty::*;
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../dist"]
struct FrontendAssets;

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let mut path = uri.path().trim_start_matches('/').to_string();
    if path.is_empty() {
        path = "index.html".to_string();
    }

    match FrontendAssets::get(path.as_str()) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
        }
        None => {
            // SPA fallback
            if let Some(index) = FrontendAssets::get("index.html") {
                ([(header::CONTENT_TYPE, "text/html")], index.data).into_response()
            } else {
                (StatusCode::NOT_FOUND, "404 Not Found").into_response()
            }
        }
    }
}

#[tokio::main]
async fn main() {
    core::set_current_dir();

    let config = load_config!();
    app::setup_log(&config);

    tokio::spawn(async {
        let cors = CorsLayer::permissive();
        let app = Router::new()
            .fallback(static_handler)
            .layer(cors);

        let listener = tokio::net::TcpListener::bind("0.0.0.0:24100").await.unwrap();
        println!("HTTP Server started at http://0.0.0.0:24100");
        axum::serve(listener, app).await.unwrap();
    });

    app::FeltyApp::new(config)
        .with_start_url(Some("http://localhost:24100/"))
        .with_internal_navigation_only(false)
        .on_before_run(|config| {
            core::process_waiting();
            core::process_cleaning(&config.cache_directory);
            core::check_webview(&config.webview_install_url);
        })
        .run();
}
