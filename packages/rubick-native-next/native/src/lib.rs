#![allow(non_snake_case)]

#[cfg(windows)]
mod folder_open_path;

#[cfg(windows)]
mod keyboard_win;

use napi::bindgen_prelude::Result;
use napi_derive::napi;

#[napi(object)]
#[allow(non_snake_case)]
pub struct ActiveWindowInfo {
  pub title: Option<String>,
  pub path: Option<String>,
  pub processId: Option<u32>,
  pub appName: Option<String>,
  pub x: Option<i32>,
  pub y: Option<i32>,
  pub width: Option<u32>,
  pub height: Option<u32>,
}

#[cfg(windows)]
mod windows_impl {
  use super::ActiveWindowInfo;
  use std::path::Path;
  use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, HWND, RECT};
  use windows_sys::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
  };
  use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowRect, GetWindowTextLengthW, GetWindowTextW,
    GetWindowThreadProcessId,
  };

  struct ProcessHandle(HANDLE);

  impl Drop for ProcessHandle {
    fn drop(&mut self) {
      if !self.0.is_null() {
        unsafe {
          CloseHandle(self.0);
        }
      }
    }
  }

  fn from_utf16(buffer: &[u16]) -> String {
    let end = buffer.iter().position(|&value| value == 0).unwrap_or(buffer.len());
    String::from_utf16_lossy(&buffer[..end])
  }

  fn get_window_title(hwnd: HWND) -> Option<String> {
    let length = unsafe { GetWindowTextLengthW(hwnd) };
    if length < 0 {
      return None;
    }

    let mut buffer = vec![0u16; length as usize + 1];
    let written = unsafe { GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32) };
    if written <= 0 {
      return Some(String::new());
    }

    Some(from_utf16(&buffer))
  }

  fn get_window_rect(hwnd: HWND) -> Option<RECT> {
    let mut rect = RECT {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    };

    let ok = unsafe { GetWindowRect(hwnd, &mut rect) };
    if ok == 0 {
      return None;
    }

    Some(rect)
  }

  fn get_process_id(hwnd: HWND) -> Option<u32> {
    let mut process_id = 0u32;
    unsafe {
      GetWindowThreadProcessId(hwnd, &mut process_id);
    }

    if process_id == 0 {
      return None;
    }

    Some(process_id)
  }

  fn get_process_path(process_id: u32) -> Option<String> {
    let raw_handle =
      unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id) };
    if raw_handle.is_null() {
      return None;
    }

    let handle = ProcessHandle(raw_handle);
    let mut buffer = vec![0u16; 32768];
    let mut size = buffer.len() as u32;

    let ok = unsafe {
      QueryFullProcessImageNameW(handle.0, 0, buffer.as_mut_ptr(), &mut size)
    };

    if ok == 0 || size == 0 {
      return None;
    }

    Some(String::from_utf16_lossy(&buffer[..size as usize]))
  }

  fn get_app_name(path: &Option<String>) -> Option<String> {
    path.as_ref().and_then(|value| {
      Path::new(value)
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
    })
  }

  pub fn get_active_window() -> Option<ActiveWindowInfo> {
    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.is_null() {
      return None;
    }

    let title = get_window_title(hwnd);
    let rect = get_window_rect(hwnd);
    let process_id = get_process_id(hwnd);
    let path = process_id.and_then(get_process_path);
    let app_name = get_app_name(&path);

    let (x, y, width, height) = if let Some(window_rect) = rect {
      let raw_width = (window_rect.right - window_rect.left).max(0) as u32;
      let raw_height = (window_rect.bottom - window_rect.top).max(0) as u32;
      (
        Some(window_rect.left),
        Some(window_rect.top),
        Some(raw_width),
        Some(raw_height),
      )
    } else {
      (None, None, None, None)
    };

    Some(ActiveWindowInfo {
      title,
      path,
      processId: process_id,
      appName: app_name,
      x,
      y,
      width,
      height,
    })
  }
}

#[cfg(not(windows))]
mod windows_impl {
  use super::ActiveWindowInfo;

  pub fn get_active_window() -> Option<ActiveWindowInfo> {
    None
  }
}

#[napi]
pub fn get_active_window() -> Result<Option<ActiveWindowInfo>> {
  Ok(windows_impl::get_active_window())
}

#[napi(js_name = "getFolderOpenPath")]
pub fn get_folder_open_path_napi() -> Result<String> {
  #[cfg(windows)]
  {
    return Ok(
      folder_open_path::get_folder_open_path().unwrap_or_default(),
    );
  }
  #[cfg(not(windows))]
  {
    Ok(String::new())
  }
}

#[napi(js_name = "sendKeyboardChord")]
pub fn send_keyboard_chord_napi(modifiers: Vec<String>, key: String) -> Result<()> {
  #[cfg(windows)]
  {
    keyboard_win::send_chord(&modifiers, &key)
      .map_err(|message| napi::Error::from_reason(message))?;
    return Ok(());
  }
  #[cfg(not(windows))]
  {
    let _ = (modifiers, key);
    Ok(())
  }
}
