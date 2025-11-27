# Design Guidelines: Turkish Investment & Portfolio Tracking Platform

## Design Approach
Reference-based approach inspired by Turkish financial platforms (İş Yatırım, Garanti BBVA Yatırım) - clean, professional financial dashboard design with Turkish UX conventions.

## Color System
- **Primary**: #1E3A8A (koyu mavi / dark blue)
- **Secondary**: #6B7280 (gri / gray)
- **Background**: #FFFFFF (beyaz / white)
- **Text**: #111827 (koyu gri / dark gray)
- **Success**: #10B981 (yeşil / green) - for positive returns/gains
- **Warning**: #F59E0B (turuncu / orange) - for alerts/losses

## Typography
- **Font Families**: Inter or Roboto
- **Hierarchy**: 
  - Large numbers/metrics: Bold, 32-36px (net değer, toplam varlık)
  - Section headers: Semibold, 20-24px
  - Card titles: Medium, 16-18px
  - Body text: Regular, 14-16px
  - Labels/captions: Regular, 12-14px

## Layout System
- **Spacing**: Use Tailwind units of 4, 5, 6, 8 (e.g., p-4, p-5, p-6, p-8, gap-4, gap-6)
- **Border Radius**: 8px (rounded-lg) for cards and components
- **Primary Grid**: 20px base spacing between major elements

## Application Structure

### Layout Architecture
- **Left Sidebar Navigation** (fixed, 240-280px width):
  - Portföyüm
  - İşlemler
  - Raporlar
  - Ayarlar
  - Logo at top, menu items with icons

- **Top Bar**:
  - Platform title/logo (left)
  - User profile, notifications, çıkış button (right)

- **Main Content Area**:
  - Dashboard cards in responsive grid
  - Full-width charts and tables

## Dashboard Components

### Summary Cards (Top Row)
Four prominent metric cards displaying:
1. **Toplam Varlık** - with growth indicator
2. **Toplam Borç** - with change indicator  
3. **Net Değer** - highlighted as primary metric
4. **Aylık Değişim** - percentage with color coding (green/orange)

Card styling: White background, subtle shadow, 8px radius, 20px padding

### Data Visualization
- **Varlık Dağılımı**: Donut/pie chart showing asset allocation percentages
- **Performans Grafiği**: Line chart showing 12-month performance trend
- Use Chart.js or Recharts libraries with specified color palette

### Portfolio Table
Columns: Varlık Adı | Tip | Miktar | Değer | Performans (%)
- Striped rows for readability
- Interactive hover states
- Action buttons (düzenle/sil) per row
- Sortable columns

### Forms (Varlık Ekleme)
- Dropdown for varlık tipi (Hisse Senedi, ETF, Kripto, Gayrimenkul)
- Input fields with clear Turkish labels
- Primary action button in #1E3A8A
- Form validation with helpful Turkish error messages

## Component Library

### Buttons
- **Primary**: #1E3A8A background, white text, 8px radius
- **Secondary**: #6B7280 background, white text
- **Success**: #10B981 for confirmations
- **Warning**: #F59E0B for destructive actions

### Cards
White background, subtle shadow (shadow-sm or shadow-md), 8px border radius, consistent padding (p-5 or p-6)

### Navigation
Active menu item: #1E3A8A background with white text
Inactive: #6B7280 text with hover state

### Tables
Header: Light gray background (#F9FAFB), bold text
Rows: Alternating white/light gray, hover highlight

## Turkish Language Implementation
All UI elements, labels, buttons, messages, and tooltips in Turkish:
- Portföyüm (My Portfolio)
- İşlemler (Transactions)
- Raporlar (Reports)
- Ayarlar (Settings)
- Toplam Varlık (Total Assets)
- Net Değer (Net Worth)
- Varlık Ekle (Add Asset)
- Performans (Performance)

## Responsive Design
- **Desktop** (lg): Full sidebar + main content
- **Tablet** (md): Collapsible sidebar, stacked cards (2 columns)
- **Mobile**: Hidden sidebar (hamburger menu), single column cards, scrollable tables

## Images
No hero images required. This is a financial dashboard focused on data visualization and functionality. Use icon libraries (Heroicons or Font Awesome) for navigation and UI elements.

## Key Principles
- Professional financial aesthetic
- Data-first hierarchy - metrics immediately visible
- Turkish financial platform conventions
- Clear visual feedback for financial gains (green) and losses (orange)
- Fast, efficient navigation for portfolio management
- Trust and credibility through clean, corporate design