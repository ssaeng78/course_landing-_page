/* แก้เบอร์สถาบันที่ไฟล์นี้ที่เดียว — ทุกหน้าจะอ่านค่านี้ */
window.SITE_CONTACT = {
  institutePhoneDisplay: "080-907-1543, 097-429-8991",
  institutePhoneCompact: "0974298991, 0809071543",
  institutePhoneOffice: "080-907-1543",
  institutePhoneIt: "097-429-8991"
};

(function applySiteContact() {
  var contact = window.SITE_CONTACT;
  if (!contact) return;

  function fill(attr, value) {
    document.querySelectorAll("[" + attr + "]").forEach(function (el) {
      el.textContent = value;
    });
  }

  fill("data-institute-phone", contact.institutePhoneDisplay);
  fill("data-institute-phone-compact", contact.institutePhoneCompact);
  fill("data-institute-phone-office", contact.institutePhoneOffice);
  fill("data-institute-phone-it", contact.institutePhoneIt);
})();
