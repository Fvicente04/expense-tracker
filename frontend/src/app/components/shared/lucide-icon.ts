import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideWallet, LucideCreditCard, LucideBanknote, LucideTrendingUp, LucideTrendingDown,
  LucideCoins, LucideLandmark, LucideChartColumn, LucidePiggyBank, LucideDollarSign,
  LucideHome, LucideSofa, LucideHammer, LucideWrench, LucideZap, LucideFlame,
  LucideShield, LucideKey, LucideLock, LucideTv,
  LucideCar, LucidePlane, LucideTrainFront, LucideBike, LucideBusFront,
  LucideShip, LucideTruck, LucideFuel, LucideNavigation, LucideMapPin,
  LucideUtensils, LucideUtensilsCrossed, LucideCoffee, LucideWine, LucideApple,
  LucidePizza, LucideCake, LucideShoppingCart, LucideTag, LucidePackage,
  LucideHeart, LucideDumbbell, LucideActivity, LucideBrain, LucideStethoscope,
  LucidePill, LucideHeartPulse, LucideSyringe, LucideEye, LucideBaby,
  LucideGamepad2, LucideClapperboard, LucideMusic, LucidePalette, LucideBookOpen,
  LucideMic, LucideHeadphones, LucideTicket, LucideCamera, LucideSparkles,
  LucideShoppingBag, LucideShirt, LucideWatch, LucideSmartphone, LucideLaptop,
  LucideGem, LucideGift, LucideMonitor, LucideStar, LucideBackpack,
  LucideBriefcase, LucideGraduationCap, LucidePencil, LucideFileText,
  LucideMail, LucidePhone, LucideCode, LucideBell, LucideSmile, LucideGlobe,
  LucideMap, LucideMountain, LucideCompass, LucideSun, LucideMoon,
  LucideUmbrella, LucideLeaf, LucideCloud, LucidePawPrint, LucideFlag,
  LucideUsers, LucideUser,
} from '@lucide/angular';

export const LUCIDE_ICON_NAMES = new Set([
  'wallet','creditCard','banknote','trendingUp','trendingDown','coins','landmark','chartColumn','piggyBank','dollarSign',
  'home','sofa','hammer','wrench','zap','flame','shield','key','lock','tv',
  'car','plane','trainFront','bike','busFront','ship','truck','fuel','navigation','mapPin',
  'utensils','utensilsCrossed','coffee','wine','apple','pizza','cake','shoppingCart','tag','package',
  'heart','dumbbell','activity','brain','stethoscope','pill','heartPulse','syringe','eye','baby',
  'gamepad2','clapperboard','music','palette','bookOpen','mic','headphones','ticket','camera','sparkles',
  'shoppingBag','shirt','watch','smartphone','laptop','gem','gift','monitor','star','backpack',
  'briefcase','graduationCap','pencil','fileText','mail','phone','code','bell','smile','globe',
  'map','mountain','compass','sun','moon','umbrella','leaf','cloud','pawPrint','flag',
  'users','user',
]);

@Component({
  selector: 'app-lucide-icon',
  standalone: true,
  imports: [
    CommonModule,
    LucideWallet, LucideCreditCard, LucideBanknote, LucideTrendingUp, LucideTrendingDown,
    LucideCoins, LucideLandmark, LucideChartColumn, LucidePiggyBank, LucideDollarSign,
    LucideHome, LucideSofa, LucideHammer, LucideWrench, LucideZap, LucideFlame,
    LucideShield, LucideKey, LucideLock, LucideTv,
    LucideCar, LucidePlane, LucideTrainFront, LucideBike, LucideBusFront,
    LucideShip, LucideTruck, LucideFuel, LucideNavigation, LucideMapPin,
    LucideUtensils, LucideUtensilsCrossed, LucideCoffee, LucideWine, LucideApple,
    LucidePizza, LucideCake, LucideShoppingCart, LucideTag, LucidePackage,
    LucideHeart, LucideDumbbell, LucideActivity, LucideBrain, LucideStethoscope,
    LucidePill, LucideHeartPulse, LucideSyringe, LucideEye, LucideBaby,
    LucideGamepad2, LucideClapperboard, LucideMusic, LucidePalette, LucideBookOpen,
    LucideMic, LucideHeadphones, LucideTicket, LucideCamera, LucideSparkles,
    LucideShoppingBag, LucideShirt, LucideWatch, LucideSmartphone, LucideLaptop,
    LucideGem, LucideGift, LucideMonitor, LucideStar, LucideBackpack,
    LucideBriefcase, LucideGraduationCap, LucidePencil, LucideFileText,
    LucideMail, LucidePhone, LucideCode, LucideBell, LucideSmile, LucideGlobe,
    LucideMap, LucideMountain, LucideCompass, LucideSun, LucideMoon,
    LucideUmbrella, LucideLeaf, LucideCloud, LucidePawPrint, LucideFlag,
    LucideUsers, LucideUser,
  ],
  template: `
    <ng-container [ngSwitch]="name">
      <svg *ngSwitchCase="'wallet'"        lucideWallet        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'creditCard'"    lucideCreditCard    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'banknote'"      lucideBanknote      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'trendingUp'"    lucideTrendingUp    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'trendingDown'"  lucideTrendingDown  [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'coins'"         lucideCoins         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'landmark'"      lucideLandmark      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'chartColumn'"   lucideChartColumn   [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'piggyBank'"     lucidePiggyBank     [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'dollarSign'"    lucideDollarSign    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'home'"          lucideHome          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'sofa'"          lucideSofa          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'hammer'"        lucideHammer        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'wrench'"        lucideWrench        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'zap'"           lucideZap           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'flame'"         lucideFlame         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'shield'"        lucideShield        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'key'"           lucideKey           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'lock'"          lucideLock          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'tv'"            lucideTv            [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'car'"           lucideCar           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'plane'"         lucidePlane         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'trainFront'"    lucideTrainFront    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'bike'"          lucideBike          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'busFront'"      lucideBusFront      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'ship'"          lucideShip          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'truck'"         lucideTruck         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'fuel'"          lucideFuel          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'navigation'"    lucideNavigation    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'mapPin'"        lucideMapPin        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'utensils'"      lucideUtensils      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'utensilsCrossed'" lucideUtensilsCrossed [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'coffee'"        lucideCoffee        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'wine'"          lucideWine          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'apple'"         lucideApple         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'pizza'"         lucidePizza         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'cake'"          lucideCake          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'shoppingCart'"  lucideShoppingCart  [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'tag'"           lucideTag           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'package'"       lucidePackage       [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'heart'"         lucideHeart         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'dumbbell'"      lucideDumbbell      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'activity'"      lucideActivity      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'brain'"         lucideBrain         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'stethoscope'"   lucideStethoscope   [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'pill'"          lucidePill          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'heartPulse'"    lucideHeartPulse    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'syringe'"       lucideSyringe       [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'eye'"           lucideEye           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'baby'"          lucideBaby          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'gamepad2'"      lucideGamepad2      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'clapperboard'"  lucideClapperboard  [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'music'"         lucideMusic         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'palette'"       lucidePalette       [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'bookOpen'"      lucideBookOpen      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'mic'"           lucideMic           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'headphones'"    lucideHeadphones    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'ticket'"        lucideTicket        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'camera'"        lucideCamera        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'sparkles'"      lucideSparkles      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'shoppingBag'"   lucideShoppingBag   [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'shirt'"         lucideShirt         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'watch'"         lucideWatch         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'smartphone'"    lucideSmartphone    [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'laptop'"        lucideLaptop        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'gem'"           lucideGem           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'gift'"          lucideGift          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'monitor'"       lucideMonitor       [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'star'"          lucideStar          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'backpack'"      lucideBackpack      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'briefcase'"     lucideBriefcase     [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'graduationCap'" lucideGraduationCap [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'pencil'"        lucidePencil        [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'fileText'"      lucideFileText      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'mail'"          lucideMail          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'phone'"         lucidePhone         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'code'"          lucideCode          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'bell'"          lucideBell          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'smile'"         lucideSmile         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'globe'"         lucideGlobe         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'map'"           lucideMap           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'mountain'"      lucideMountain      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'compass'"       lucideCompass       [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'sun'"           lucideSun           [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'moon'"          lucideMoon          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'umbrella'"      lucideUmbrella      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'leaf'"          lucideLeaf          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'cloud'"         lucideCloud         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'pawPrint'"      lucidePawPrint      [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'flag'"          lucideFlag          [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'users'"         lucideUsers         [size]="size" [strokeWidth]="sw"></svg>
      <svg *ngSwitchCase="'user'"          lucideUser          [size]="size" [strokeWidth]="sw"></svg>
    </ng-container>
  `,
  styles: [':host { display: inline-flex; align-items: center; justify-content: center; }']
})
export class LucideIconComponent {
  @Input() name = '';
  @Input() size = 20;
  @Input() strokeWidth = 1.5;
  get sw() { return this.strokeWidth; }
}
