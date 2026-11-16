use crate::utils::add_log;
use core_foundation::base::TCFType;
use core_foundation::string::{CFString, CFStringRef};
use std::os::raw::c_int;

const APP_BUNDLE_ID: &str = "com.promin.pdf";
const PDF_UTI: &str = "com.adobe.pdf";
const LS_ROLES_ALL: c_int = 0xFFFFFFFF_u32 as c_int;

#[link(name = "CoreServices", kind = "framework")]
extern "C" {
    fn LSCopyDefaultRoleHandlerForContentType(content_type: CFStringRef, role: c_int) -> CFStringRef;
    fn LSSetDefaultRoleHandlerForContentType(
        content_type: CFStringRef,
        role: c_int,
        handler_bundle_id: CFStringRef,
    ) -> c_int;
}

#[tauri::command]
pub fn is_default_pdf_handler() -> Result<bool, String> {
    let content_type = CFString::new(PDF_UTI);
    let handler = unsafe {
        LSCopyDefaultRoleHandlerForContentType(content_type.as_concrete_TypeRef(), LS_ROLES_ALL)
    };
    if handler.is_null() {
        return Ok(false);
    }
    let handler = unsafe { CFString::wrap_under_create_rule(handler) }.to_string();
    Ok(handler == APP_BUNDLE_ID)
}

#[tauri::command]
pub fn set_as_default_pdf_handler() -> Result<String, String> {
    let content_type = CFString::new(PDF_UTI);
    let bundle_id = CFString::new(APP_BUNDLE_ID);
    let status = unsafe {
        LSSetDefaultRoleHandlerForContentType(
            content_type.as_concrete_TypeRef(),
            LS_ROLES_ALL,
            bundle_id.as_concrete_TypeRef(),
        )
    };
    if status == 0 {
        add_log("Set Promin as the default PDF handler on macOS".to_string());
        Ok("set_successfully".to_string())
    } else {
        Err(format!("LaunchServices returned status: {status}"))
    }
}
