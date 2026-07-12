-- SQL Migration to update dynamic API documentation for the new GLB Embed API

-- Clear existing docs
TRUNCATE TABLE public.api_documentation;

-- Insert Section 1
INSERT INTO public.api_documentation (title, content, section_order, is_published)
VALUES 
(
  'Introduction & Overview',
  'Welcome to the HousePadi GLB Embed API. 

The HousePadi Embed API acts as an interactive 3D and AR viewer (similar to Google AR Viewer) that developers can integrate directly on external websites using a standard HTML `<iframe>`. 

### Key Capabilities
- **Direct GLB Rendering:** Pass in the URL of any 3D asset in `.glb` format to render it inside a high-fidelity interactive viewport.
- **360 Walk Mode:** Users can click and drag to look around, use keyboard controls, or use virtual on-screen joysticks to explore.
- **AR Portal Mode:** Instantly switch to augmented reality to place the model in a 1:1 real-world scale environment via WebXR (or Apple Quick Look on iOS / Scene Viewer on Android).',
  1,
  true
);

-- Insert Section 2
INSERT INTO public.api_documentation (title, content, section_order, is_published)
VALUES 
(
  'Iframe Integration & Parameters',
  'To load a 3D model, embed the HousePadi viewer in your website using an iframe.

### Integration Template
```html
<iframe 
  src="https://housepadi-portal.vercel.app/embed?glb=https://example.com/your-model.glb&UseJoystick=true&apiKey=YOUR_API_KEY" 
  width="100%" 
  height="600px" 
  frameborder="0" 
  allow="xr-spatial-tracking"
></iframe>
```

### URL Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`glb`** | String | **Yes** | The absolute, HTTPS-secured URL of your `.glb` 3D model. |
| **`apiKey`** | String | **Yes** | Your active developer token (e.g., `pxr_dev_...`). |
| **`UseJoystick`** | Boolean | No | Toggles virtual movement joysticks on mobile/touch screens. Set to `true` (default) to show, or `false` to hide. |

*Note: Make sure your target server allows CORS requests on the GLB file URL so our viewer can load and render the asset.*',
  2,
  true
);

-- Insert Section 3
INSERT INTO public.api_documentation (title, content, section_order, is_published)
VALUES 
(
  'Billing & Call Usage Limits',
  'Each time an iframe loading your custom GLB is initialized on a client browser, it makes one API call against your developer token.

### Pricing Structure
- **Usage Metrics:** Pricing is calculated based strictly on the total volume of monthly calls (embed loads).
- **Hard Rate-Limiting:** If a key reaches its monthly included call quota, further loads will suspend rendering and show a usage limit warning. 
- **Upgrades:** You can update your pricing tier and limits at any time in the Developer Console to restore service or increase quotas.',
  3,
  true
);
