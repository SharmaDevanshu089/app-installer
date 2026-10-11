// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::panic;

fn main() {
    // Catch-all panic hook: logs any fatal backend panics into app-installer.log in root
    panic::set_hook(Box::new(|info| {
        let msg = match info.payload().downcast_ref::<&'static str>() {
            Some(s) => *s,
            None => match info.payload().downcast_ref::<String>() {
                Some(s) => &s[..],
                None => "Box<Any>",
            },
        };
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());

        let formatted = format!("FATAL CRASH / PANIC: '{}' at {}", msg, location);
        app_installer_lib::logger::log_msg("FATAL", "PANIC_HOOK", &formatted);
    }));

    app_installer_lib::run()
}
