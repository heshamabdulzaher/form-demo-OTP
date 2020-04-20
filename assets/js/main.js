const apiBase = 'https://api-sim.laywagif.com';
let lang;
if (window.location.pathname === '/en/') {
  lang = 'en';
} else {
  lang = 'ar';
}

window.onload = function () {
  formValidation();
};

function formValidation() {
  let currentActiveStep = document.querySelector('.step.active');
  let formFields = currentActiveStep.querySelectorAll(
    '.form-field input[name]'
  );
  let submitBtn = currentActiveStep.querySelector('.main-btn');
  formFields.forEach((inp) => {
    inp.addEventListener('keyup', (e) => {
      if (e.target.checkValidity()) {
        e.target.closest('.form-group').classList.remove('invalid');
        e.target.classList.add('valid');
      } else {
        e.target.classList.remove('valid');
      }
      let inValidFields = [].some.call(
        formFields,
        (inp) => !inp.classList.contains('valid')
      );
      if (!inValidFields) {
        submitBtn.removeAttribute('disabled');
        submitBtn.classList.add('active');
      } else {
        submitBtn.setAttribute('disabled', '');
        submitBtn.classList.remove('active');
      }
    });
    inp.addEventListener('blur', (e) => {
      if (e.target.checkValidity()) {
        e.target.closest('.form-group').classList.remove('invalid');
        e.target.classList.add('valid');
      } else {
        e.target.closest('.form-group').classList.add('invalid');
        if (e.target.value.trim() == '') {
          e.target
            .closest('.form-group')
            .querySelector(
              'small'
            ).innerHTML = window.location.pathname.includes('/en/')
            ? 'This field is required'
            : 'هذا الحقل مطلوب لإتمام الطلب';
        } else {
          e.target
            .closest('.form-group')
            .querySelector('small').innerHTML = e.target.getAttribute(
            'data-err-msg'
          );
        }
      }
    });
  });
}
// Send OTP
function sendOTP(mobile) {
  return fetch(apiBase + '/api/otp', {
    method: 'post',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mobile: mobile,
    }),
  })
    .catch((e) => {
      throw 'Request error';
    })
    .then((res) => {
      if (res.status === 429) {
        throw 'Limit';
      }
      return res.json();
    })
    .then((res) => {
      if (res.success !== 'true') {
        throw res.message || 'OTP sending error';
      }
    });
}

// Render next step
function renderNextStep(e) {
  e.preventDefault();
  // remove active class from current step, add active class to the next step using data-step-index attr
  let nextIndex = parseInt(e.target.getAttribute('data-step-index')) + 1;
  let nextStep = document.querySelector(
    `.step[data-step-index="${nextIndex}"]`
  );
  const submitBtn = e.target.querySelector('.main-btn');
  if (nextIndex === 2) {
    submitBtn.setAttribute('disabled', '');
    fetch(
      apiBase +
        '/api/serial-numbers?number=' +
        e.target.querySelector('input[name=serialNumber]').value,
      {
        method: 'get',
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
      }
    )
      .then((res) => res.json())
      .then((res) => {
        if (res.exist !== true) {
          renderErrMsg('SerialNumberNotExistError');
          submitBtn.removeAttribute('disabled');
        } else {
          e.target.classList.remove('active');
          nextStep.classList.add('active');
          formValidation();
        }
      })
      .catch((e) => {
        renderErrMsg('requestError');
        submitBtn.removeAttribute('disabled');
      });
  } else if (nextIndex === 3) {
    submitBtn.setAttribute('disabled', '');
    let phoneNumberInp = e.target.querySelector('input[name=mobile]');
    let phoneNumber = phoneNumberInp.value.substring(
      phoneNumberInp.value.charAt(0) == 0
    );
    sendOTP('+966' + phoneNumber)
      .then(() => {
        e.target.classList.remove('active');
        nextStep.classList.add('active');
        formValidation();
      })
      .catch((e) => {
        if (e === 'Limit') {
          renderErrMsg('limitError');
        } else {
          renderErrMsg('requestError');
        }
        submitBtn.removeAttribute('disabled');
      });
  } else if (nextIndex === 4) {
    let requestBody = {};
    document.querySelectorAll('.step .form-field input[name]').forEach((i) => {
      requestBody[i.getAttribute('name')] = i.value;
    });
    requestBody.mobile =
      '+966' + requestBody.mobile.substring(requestBody.mobile.charAt(0) == 0);
    requestBody.cityId = parseInt(requestBody.cityId);
    requestBody.requestSource = document.body.dataset.source;
    submitBtn.setAttribute('disabled', '');
    grecaptcha
      .execute('6Lcs0-cUAAAAAIYIBZ8LbZg_uGGkYXnTZ1J3m5Kf', {
        action: 'homepage',
      })
      .then((token) => {
        requestBody.recaptchaToken = token;
        fetch(apiBase + '/api/requests', {
          method: 'post',
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
          .then((res) => res.json())
          .then((res) => {
            console.log(res);
            if (res.success !== true) {
              if (res.data && res.data.otpNotPassed !== undefined) {
                // Error on OTP, so resend OTP
                sendOTP(requestBody.mobile)
                  .then(() => {
                    renderErrMsg('OTPError');
                  })
                  .catch((e) => {
                    if (e === 'Limit') {
                      renderErrMsg('limitError');
                    } else {
                      renderErrMsg('requestError');
                    }
                  });
              } else if (res.data && res.data.alreadySubmitted) {
                renderErrMsg('sameSerialNumberError');
              } else {
                renderErrMsg('requestError');
              }
              submitBtn.removeAttribute('disabled');
            } else {
              e.target.classList.remove('active');
              nextStep.classList.add('active');
              formValidation();
            }
          })
          .catch((e) => {
            renderErrMsg('requestError');
            submitBtn.removeAttribute('disabled');
          });
      });
  } else {
    e.target.classList.remove('active');
    nextStep.classList.add('active');
    formValidation();
  }
}

// City dropdown
function loadGeoDropdown(dropdown, endpoint, callback) {
  let lang = dropdown.dataset.lang;
  let wrap = dropdown.querySelector('.dropdown-wrap');
  wrap.innerHTML = '';
  dropdown.classList.add('disabled');
  dropdown.classList.remove('empty');
  let btn = dropdown.querySelector('button');
  btn.innerText = btn.dataset.default;
  let input = dropdown.querySelector('input[type=hidden]');
  input.value = '';
  input.classList.remove('valid');
  fetch(apiBase + '/api/' + endpoint, {
    method: 'get',
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  })
    .then((res) => res.json())
    .then((data) => {
      data.data.map((item) => {
        let a = document.createElement('a'),
          id = item.id,
          name = lang === 'ar' ? item.nameAr : item.nameEn;
        a.innerText = name;
        a.addEventListener('click', (e) => {
          e.stopPropagation();
          input.value = id;
          input.classList.add('valid');
          btn.innerText = name;
          dropdown.classList.remove('open');
          if (callback) {
            callback(id);
          }
          let currentActiveStep = document.querySelector('.step.active');
          let formFields = currentActiveStep.querySelectorAll(
            '.form-field input[name]'
          );
          let submitBtn = currentActiveStep.querySelector('.main-btn');
          let inValidFields = [].some.call(
            formFields,
            (inp) => !inp.classList.contains('valid')
          );
          if (!inValidFields) {
            submitBtn.removeAttribute('disabled');
            submitBtn.classList.add('active');
          } else {
            submitBtn.setAttribute('disabled', '');
            submitBtn.classList.remove('active');
          }
          return false;
        });
        wrap.append(a);
      });
      if (data.data.length > 0) {
        dropdown.classList.remove('disabled');
      } else {
        dropdown.classList.remove('disabled');
        dropdown.classList.add('empty'); // Dropdown is empty
        input.classList.add('valid');
      }
    });
}

const geoDropdowns = document.querySelectorAll('.dropdown-geo');

geoDropdowns.forEach((item) => {
  const btn = item.querySelector('button');
  btn.innerText = btn.dataset.default;
  btn.addEventListener('click', (e) => {
    item.classList.toggle('open');
    item.querySelector('input').value = '';
    item.querySelectorAll('.dropdown-wrap a').forEach((a) => {
      a.classList.remove('hide');
    });
    e.stopPropagation();
    e.preventDefault();
    return false;
  });
  item.querySelector('input[type=text]').addEventListener('keyup', (e) => {
    const val = e.target.value.toString().trim(),
      regexp = new RegExp(val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    item.querySelectorAll('.dropdown-wrap a').forEach((a) => {
      if (!val || regexp.test(a.innerHTML)) {
        a.classList.remove('hide');
      } else {
        a.classList.add('hide');
      }
    });
  });
});

const cityDropdown = document.querySelector('.dropdown-geo[data-param=city]');
loadGeoDropdown(cityDropdown, 'cities');

const errMsg = document.querySelector('.alert-err-msg');
function renderErrMsg(msgName) {
  let messages = {
    SerialNumberNotExistError: {
      en: 'The entered SIM Serial Number is invalid',
      ar: 'الرقم التسلسلي المدخل غير صحيح',
    },
    sameSerialNumberError: {
      en: 'There is another request with thie same serial number',
      ar: 'يوجد طلب آخر بنفس الرقم التسلسلي',
    },
    requestError: {
      en: 'Request error, pls try later',
      ar: 'خطأ في الطلب ، الرجاء المحاولة لاحقًا',
    },
    limitError: {
      en: 'You have reached the request limit, wait 5 minutes',
      ar: 'لقد وصلت إلى حد الطلب ، انتظر 5 دقائق',
    },
    OTPError: {
      en: 'Wrong OTP, we will resend OTP to your number',
      ar: 'الرمز غير صحيح، سوف نعيد ارساله الى رقمك',
    },
  };
  console.log();
  errMsg.innerText = messages[msgName][lang];
  errMsg.classList.add('show');
  setTimeout((e) => {
    errMsg.classList.remove('show');
  }, 8000);
}
