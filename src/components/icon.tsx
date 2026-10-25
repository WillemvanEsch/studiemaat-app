/**
 * Cross-platform icon — SF Symbol on iOS, Material Icon on Android.
 *
 * `SymbolView` (expo-symbols) renders Apple SF Symbols, which exist
 * ONLY on iOS. Without a `fallback`, a SymbolView renders an empty gap
 * on Android. This wrapper is a drop-in replacement for `<SymbolView>`
 * (same props) that injects a Material Icon fallback automatically, so
 * every icon shows up — crisp and tinted — on Android too.
 *
 * **Why this can never break iOS:** on iOS, SymbolView renders the SF
 * Symbol and the `fallback` element is never displayed. The Material
 * Icon path is Android-only. Changing the fallback therefore cannot
 * regress the live iOS app — the two platforms render different code
 * here by design.
 *
 * Adding a new icon? Use `<Icon name="<sf.symbol.name>" />` and add a
 * matching entry to SF_TO_MATERIAL below (the value is type-checked
 * against MaterialIcons' glyph map, so a typo fails the build).
 */

import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ComponentProps } from 'react';

type MaterialName = ComponentProps<typeof MaterialIcons>['name'];

const SF_TO_MATERIAL: Record<string, MaterialName> = {
  // Navigation + UI chrome.
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.up': 'keyboard-arrow-up',
  xmark: 'close',
  'xmark.circle': 'cancel',
  'xmark.circle.fill': 'cancel',
  checkmark: 'check',
  'checkmark.circle': 'check-circle',
  'checkmark.circle.fill': 'check-circle',
  'plus.circle': 'add-circle-outline',
  'plus.circle.fill': 'add-circle',
  'arrow.up': 'arrow-upward',
  'arrow.down.circle': 'file-download',
  ellipsis: 'more-horiz',
  'ellipsis.circle': 'more-horiz',
  'info.circle': 'info-outline',

  // Semantic content.
  message: 'chat-bubble-outline',
  'bubble.left.and.bubble.right': 'forum',
  flag: 'flag',
  clock: 'schedule',
  'clock.fill': 'schedule',
  'exclamationmark.circle': 'error-outline',
  'exclamationmark.circle.fill': 'error',
  'exclamationmark.triangle': 'warning-amber',
  'exclamationmark.triangle.fill': 'warning',
  magnifyingglass: 'search',
  'square.and.arrow.up': 'share',
  'person.crop.circle.badge.xmark': 'person-off',
  'person.crop.circle.badge.checkmark': 'how-to-reg',
  'person.circle': 'account-circle',
  'person.circle.fill': 'account-circle',
  trash: 'delete',
  'camera.fill': 'photo-camera',
  trophy: 'emoji-events',
  'trophy.fill': 'emoji-events',
  'creditcard.fill': 'credit-card',
  house: 'home',
  'house.fill': 'home',
  hammer: 'gavel',
  'hammer.fill': 'gavel',
  eye: 'visibility',
  heart: 'favorite-border',
  'heart.fill': 'favorite',
  'heart.slash.fill': 'heart-broken',
  'envelope.badge': 'email',
  megaphone: 'campaign',
  'lock.fill': 'lock',

  // Category symbols (mirror of lib/category-icon.ts).
  'car.fill': 'directions-car',
  'figure.child': 'child-care',
  'book.fill': 'menu-book',
  'bookmark.fill': 'bookmark',
  'box.truck.fill': 'local-shipping',
  desktopcomputer: 'computer',
  'pawprint.fill': 'pets',
  'cpu.fill': 'memory',
  bicycle: 'pedal-bike',
  'film.fill': 'movie',
  'gamecontroller.fill': 'sports-esports',
  'wrench.and.screwdriver.fill': 'handyman',
  'fork.knife': 'restaurant',
  'tag.fill': 'local-offer',
  'paintpalette.fill': 'palette',
  'music.note': 'music-note',
  'tent.fill': 'festival',
  shippingbox: 'inventory-2',
  'shippingbox.fill': 'inventory-2',
  'bag.fill': 'shopping-bag',
  sparkles: 'auto-awesome',
  'cube.fill': 'toys',
  'dumbbell.fill': 'fitness-center',
  'gift.fill': 'card-giftcard',
  'wand.and.stars': 'auto-fix-high',
  'sofa.fill': 'weekend',
  'mappin.circle': 'place',

  // Found during Android device testing (these were falling back to a dot).
  mappin: 'place',
  'eurosign.circle.fill': 'paid',
  'bubble.left': 'chat',
  gearshape: 'settings',
  pencil: 'edit',
  'checkmark.seal': 'verified',
  bookmark: 'bookmark-border',
  'bookmark.slash': 'bookmark-remove',
  'arrow.clockwise': 'refresh',

  // Studiemaat
  'book.closed': 'menu-book',
  'book.closed.fill': 'menu-book',
  'text.book.closed': 'auto-stories',
  'checklist': 'checklist',
  'list.bullet.clipboard': 'assignment',
  'list.bullet.clipboard.fill': 'assignment',
  'camera': 'photo-camera',
  'photo.on.rectangle': 'photo-library',
  'mic.fill': 'mic',
  'mic': 'mic-none',
  'stop.circle.fill': 'stop-circle',
  'speaker.wave.2.fill': 'volume-up',
  'gift': 'card-giftcard',
  'person.crop.circle': 'account-circle',
  'person.crop.circle.fill': 'account-circle',
  'gearshape.fill': 'settings',
  'arrow.counterclockwise': 'replay',
  'rectangle.on.rectangle': 'style',
  'lightbulb': 'lightbulb-outline',
  'star.fill': 'star',
  'graduationcap.fill': 'school',
  'rectangle.portrait.and.arrow.right': 'logout',
  'arrow.right': 'arrow-forward',
  'checkmark.seal.fill': 'verified',
  'stop.fill': 'stop',
  'circle.lefthalf.filled': 'contrast',
  'play.circle.fill': 'play-circle-filled',
  'person.badge.plus': 'person-add',
  'hand.raised': 'privacy-tip',
  'questionmark.circle': 'help-outline',
  'slider.horizontal.3': 'tune',
  'plus': 'add',
  'arrow.up.right.square': 'open-in-new',
  envelope: 'mail-outline',
  globe: 'language',
  'doc.text': 'description',
  'moon.fill': 'dark-mode',
  'sun.max.fill': 'light-mode',
  'iphone': 'smartphone',
  'lock.shield': 'shield',
  circle: 'radio-button-unchecked',
};

const FALLBACK_DEFAULT: MaterialName = 'circle';

type IconProps = Omit<SymbolViewProps, 'name' | 'fallback'> & {
  /** SF Symbol name. Typed loose so dynamic callers don't need `as never`. */
  name: string;
};

export function Icon({ name, size = 20, tintColor, style, ...rest }: IconProps) {
  return (
    <SymbolView
      name={name as SymbolViewProps['name']}
      size={size}
      tintColor={tintColor}
      style={style}
      {...rest}
      fallback={
        <MaterialIcons
          name={SF_TO_MATERIAL[name] ?? FALLBACK_DEFAULT}
          size={size}
          color={tintColor as string | undefined}
        />
      }
    />
  );
}
