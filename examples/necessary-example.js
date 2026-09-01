// Stands in for something like a form's anti-spam widget: the `necessary` category, which cannot be
// refused and must therefore run on every visit, including every visit after the first.
//
// It is here because that is exactly what stopped working between 2.0.0 and 2.2.0, silently, and a
// demo with no `necessary` resource on it is a demo that could not have shown you.
window.__necessaryRan = true;
